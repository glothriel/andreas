# andreas.karagiorgis.pl

Hugo site (`stack` theme + `baguettebox` galleries), published to GitHub Pages on every
push to `main` (`.github/workflows/publish.yaml`).

## Images are not in git

Gallery originals (`content/**/*.png|jpg|...`) are **not in the repo**. They live in:

- **Cloudflare R2**: `blobs/sha256/<hash>`, one object per file, never overwritten
- **GHCR** (backup): `ghcr.io/glothriel/andreas-images:<gallery>-<hash>`, one tar per gallery

`images.lock.json` (committed) says which files belong to the site. `scripts/images` handles
everything (rclone and oras run from Docker, nothing to install). Hugo does all web resizing
at build time (locally and on GHA); none of that output is committed.

## Fresh clone

```sh
make serve        # fetch images (scripts/images pull), then hugo server on :1313
make build        # same, but a one-off build into public/
```

`pull` tries the local cache `.images-cache/` first, then R2, then GHCR. R2 credentials are in
Bitwarden (`andreas-r2`); `bin/bwx` prompts for the master password.

## Adding a gallery / new images

1. `make images-pull` so you have everything locally (`push` refuses otherwise)
2. Create `content/page/<name>/index.md` and put the images next to it. Gallery markup:

   ```
   {{< gallery >}}
     {{% galimg target="1.jpg" title="Title" %}}Caption shown in the lightbox{{% /galimg %}}
   {{< /gallery >}}
   ```

   Thumbnails default to `200x150 smart` (`size=`, `mode=fill|fit|resize`); the lightbox gets
   a webp up to 2400px (`full=`). Originals are never published.
   For a menu entry, copy the front matter of `content/page/grandchildren/index.md`.
3. `make serve` and check it looks right
4. `make images-push`: uploads new files to R2 + GHCR and updates `images.lock.json`
5. `git add content/page/<name>/index.md images.lock.json && git commit && git push`

Replacing an image works the same way: swap the file, `make images-push`, commit the lock.
Deleting: remove the file, then `scripts/images push --prune`.
`make images-status` shows what differs from the lock.

## One-time setup, if something stops working

- **GHCR push** needs a `gh` token with `write:packages`: `gh auth refresh -h github.com -s write:packages`
- **CI** reads R2 from the repo secrets `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
  and `R2_BUCKET`; without them it falls back to GHCR via `GITHUB_TOKEN`. To set them from Bitwarden:
  ```sh
  item=$(bin/bwx item andreas-r2)
  jq -j '.login.uris[0].uri'  <<<"$item" | gh secret set R2_ENDPOINT
  jq -j '.login.username'     <<<"$item" | gh secret set R2_ACCESS_KEY_ID
  jq -j '.login.password'     <<<"$item" | gh secret set R2_SECRET_ACCESS_KEY
  jq -j '.fields[]|select(.name=="bucket").value' <<<"$item" | gh secret set R2_BUCKET
  ```
- **Hugo version** is pinned to the same version in `docker-compose.yml` and the workflow.
  Newer Hugo dropped the built-in LibSass the `stack` theme needs.
- **Local requirements**: docker, python3, `bw` (Bitwarden CLI, logged in), `gh`.
