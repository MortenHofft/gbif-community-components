#!/usr/bin/env bash
# Publishes the built files so that a CDN that reads GitHub (jsDelivr) can serve them.
#
#   npm run build && scripts/publish-dist.sh v0.1.0
#
# It makes a commit that holds ONLY the contents of dist/ (no source, no history), tags it
# `dist-<version>`, and updates the `dist` branch to point at it. A tag is never moved, so a URL that names one
# always returns the same bytes:
#
#   https://cdn.jsdelivr.net/gh/MortenHofft/gbif-community-components@dist-v0.1.0/gbif-components.js
#
# The source branches stay free of build output. The GitHub Action in .github/workflows runs this on every `v*` tag.
set -euo pipefail

version="${1:?usage: scripts/publish-dist.sh <version, e.g. v0.1.0>}"
if ! [[ "$version" =~ ^[A-Za-z0-9._-]+$ ]]; then echo "The version may only hold letters, digits, dots, dashes and underscores." >&2; exit 1; fi
tag="dist-${version}"
root="$(git rev-parse --show-toplevel)"

[ -f "$root/dist/gbif-components.js" ] || { echo "dist/ is missing: run npm run build first." >&2; exit 1; }
if git ls-remote --exit-code --tags origin "refs/tags/${tag}" >/dev/null 2>&1; then
  echo "${tag} already exists. Tags are never moved: use a new version." >&2
  exit 1
fi

source_commit="$(git -C "$root" rev-parse --short HEAD)"
work="$(mktemp -d)"
trap 'git -C "$root" worktree remove --force "$work" >/dev/null 2>&1 || true' EXIT

git -C "$root" worktree add --detach "$work" HEAD >/dev/null
cd "$work"
git checkout --orphan dist-build >/dev/null 2>&1
git rm -rf --quiet . >/dev/null 2>&1 || true
find . -mindepth 1 -maxdepth 1 ! -name .git -exec rm -rf {} +
cp -R "$root/dist/." .
cat > README.md <<README
Built files of gbif-community-components ${version} (built from source commit ${source_commit}).
Load the bundle as a module and keep the chunks/ folder next to it:

  <script type="module" src="https://cdn.jsdelivr.net/gh/MortenHofft/gbif-community-components@${tag}/gbif-components.js"></script>
README
git add -A
git -c user.name="${GIT_AUTHOR_NAME:-gbif-components release}" -c user.email="${GIT_AUTHOR_EMAIL:-noreply@users.noreply.github.com}" \
  commit --quiet -m "Built files for ${version} (source ${source_commit})"
git tag "${tag}"
git push origin "refs/tags/${tag}"
git push --force origin dist-build:refs/heads/dist
echo
echo "Published ${tag}. Load it with:"
echo "  https://cdn.jsdelivr.net/gh/MortenHofft/gbif-community-components@${tag}/gbif-components.js"
