#!/bin/sh
# Updates the container on the server. Run it in the clone of the repository.
#
#   docker/update.sh            update to the newest commit of master
#   docker/update.sh <commit>   update (or roll back) to that commit
#
# The image is built here, on the server, from the commit that is checked out.
# Server-specific settings belong in .env and compose.override.yaml, which git
# ignores. On the first run .env is created from .env.example, and the ALTCHA
# secret is generated when it is missing. The mail account has to be filled in
# by hand.
set -eu

NGINX_TEMPLATE=docker/nginx.example.conf

# The commit that .env says is running, or nothing.
deployed_commit() {
  commit=$(env_value COMMIT_HASH)
  [ -z "$commit" ] || git rev-parse --verify --quiet "$commit^{commit}" || true
}

short() {
  git rev-parse --short=7 "$1"
}

describe() {
  git log -1 --format='%h %s' "$1"
}

# Whether the nginx template differs between two commits.
nginx_changed() {
  [ -n "$1" ] && ! git diff --quiet "$1" "$2" -- "$NGINX_TEMPLATE"
}

# The value of a variable in .env, or nothing.
env_value() {
  [ -f .env ] && sed -n "s/^$1=//p" .env | tail -n 1
}

# Sets a variable in .env: replaced where it is, appended otherwise.
set_env() {
  if grep -q "^$1=" .env 2> /dev/null; then
    sed -i "s|^$1=.*|$1=$2|" .env
  else
    [ ! -s .env ] || [ -z "$(tail -c 1 .env)" ] || echo >> .env
    echo "$1=$2" >> .env
  fi
}

random_secret() {
  openssl rand -hex 32 2> /dev/null \
    || head -c 32 /dev/urandom | od -An -tx1 | tr -d ' \n'
}

# Makes sure .env exists and has everything the app needs. The ALTCHA secret
# is generated, the mail account has to come from the server admin.
check_env() {
  if [ ! -f .env ]; then
    cp .env.example .env
    echo "Created .env from .env.example"
  fi
  if [ -z "$(env_value NUXT_ALTCHA_HMAC_KEY)" ]; then
    set_env NUXT_ALTCHA_HMAC_KEY "$(random_secret)"
    echo "Generated NUXT_ALTCHA_HMAC_KEY in .env"
  fi
  missing=
  for name in EMAIL_USERNAME EMAIL_PASSWORD EMAIL_TO; do
    [ -n "$(env_value "$name")" ] || missing="$missing $name"
  done
  if [ -n "$missing" ]; then
    echo "Error: set$missing in .env, the app cannot send mails without them." >&2
    exit 1
  fi
}

main() {
  wanted=
  for arg in "$@"; do
    case $arg in
      -*) echo "Unknown option: $arg" >&2; exit 2 ;;
      *) wanted=$arg ;;
    esac
  done

  cd "$(dirname "$0")/.."

  if [ -n "$(git status --porcelain --untracked-files=no)" ]; then
    echo "Error: tracked files have local changes, which would be lost." >&2
    echo "  Keep server settings in compose.override.yaml and .env." >&2
    exit 1
  fi
  git fetch --quiet origin master

  check_env

  current=$(deployed_commit)
  here=$(git rev-parse HEAD)
  if [ -n "$current" ]; then
    echo "Running: $(describe "$current")"
  else
    echo "Running: nothing deployed yet"
  fi
  [ "$here" = "$current" ] || echo "Checked out: $(describe "$here")"

  if [ -n "$wanted" ]; then
    target=$(git rev-parse --verify --quiet "$wanted^{commit}") || {
      echo "Error: unknown commit $wanted" >&2
      exit 1
    }
  else
    target=$(git rev-parse origin/master)
  fi

  if [ "$target" = "$current" ] && [ "$target" = "$here" ]; then
    echo "Already up to date."
    exit 0
  fi

  # What the target is, compared with what is running (or else checked out).
  base=${current:-$here}
  kind=Update
  if [ "$target" = "$base" ]; then
    echo "Target:  $(describe "$target")"
  elif git merge-base --is-ancestor "$base" "$target"; then
    echo "Update:  $(describe "$target")"
    echo "Changes:"
    git log --format='  %h %s' "$base..$target"
  elif git merge-base --is-ancestor "$target" "$base"; then
    kind="Roll back"
    echo "Rollback: $(describe "$target")"
    echo "WARNING: $(short "$target") is older than $(short "$base"). Left behind:"
    git log --format='  %h %s' "$target..$base"
  else
    kind=Switch
    echo "Switch:  $(describe "$target")"
    echo "WARNING: $(short "$target") and $(short "$base") have diverged."
  fi

  unpushed=$(git rev-list --count origin/master..HEAD)
  if [ "$unpushed" -gt 0 ] && [ "$target" != "$here" ]; then
    echo "WARNING: $unpushed commit(s) of this clone are not on origin/master (not pushed)."
  fi

  changed_nginx=0
  if nginx_changed "$current" "$target"; then
    changed_nginx=1
    echo ""
    echo "WARNING: $NGINX_TEMPLATE changed. Check the nginx config of this server:"
    git diff "$current" "$target" -- "$NGINX_TEMPLATE"
  fi

  printf '%s to %s? [y/N] ' "$kind" "$(short "$target")"
  read -r answer
  case $answer in
    y|Y|j|J) ;;
    *) echo "Cancelled."; exit 0 ;;
  esac

  git checkout --quiet --detach "$target"
  # The commit goes into .env only when the update has worked.
  export COMMIT_HASH="$(short "$target")"
  docker compose up -d --build --wait
  set_env COMMIT_HASH "$COMMIT_HASH"
  docker image prune --force > /dev/null

  echo "Now running: $(describe "$target")"
  if [ "$changed_nginx" -eq 1 ]; then
    echo ""
    echo "WARNING: $NGINX_TEMPLATE changed. Apply it to the nginx config of this server."
  elif [ -z "$current" ]; then
    echo ""
    echo "First deployment: set up nginx with $NGINX_TEMPLATE."
  fi
}

# On one line, so the shell has read it all before git replaces this file.
main "$@"; exit $?
