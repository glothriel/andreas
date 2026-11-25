# andreas.karagiorgis.pl

Hugo site with its own theme (`layouts/`, `assets/`, `i18n/`), published to GitHub Pages on
every push to `main` (`.github/workflows/publish.yaml`).

## How the site works

One screen, a sketchbook: gallery tiles on the left, a notebook page with the stories on the
right. Everything else opens as a paper sheet over it:

| What | Content | URL | Opens as |
|---|---|---|---|
| Gallery | `content/page/<name>/` with images | `/<name>/` | album with polaroids + lightbox |
| Story | `content/posts/<name>.md` | `/opowiadania/<name>/` | lined-paper reader |
| About | `content/page/about/` | `/about/` | card with the photo `assets/img/andreas.png` |
| Contact | `content/page/contact/` (`layout: contact`) | `/contact/` | letter that folds into a paper plane |

Every one of those URLs is a real page (the desk with that sheet open), so links can be shared
and the site works without JavaScript; `assets/js/site.js` just opens them in place.

- **Gallery order**: front matter `date`, newest first. The tile grid resizes itself to fill
  the screen; above 9 galleries the last tile becomes "+N galerii". Optional `cover: 3.jpg`
  picks the first image of the tile slideshow.
- **Story list**: newest first, reading time from Hugo, teaser from the first lines
  (override with front matter `lead:`). Drafts are hidden in the production build.
- **Contact** posts straight into the Google Form set in `config.yaml` (`params.contactForm`);
  the e-mail field is appended to the message.
- **Languages**: pl, en, el (flags in the header). UI strings are in `i18n/`. Galleries are
  shared by all languages; stories, about and contact fall back to Polish when there is no
  translation (`index.en.md` etc.).
- `mockups/` (not in git) holds the static design mockups this theme came from.

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
   Give it a `date:` (newest galleries come first on the home page).
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
- **Local requirements**: docker, python3, `bw` (Bitwarden CLI, logged in), `gh`.
