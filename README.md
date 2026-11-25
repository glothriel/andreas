# andreas.karagiorgis.pl

Strona Hugo (motyw `stack` + galerie `baguettebox`), publikowana na GitHub Pages
przy każdym pushu na `main` (`.github/workflows/publish.yaml`).

## Obrazki są poza gitem

Oryginały galerii (`content/**/*.png|jpg|...`) **nie są w repo**. Leżą w:

- **Cloudflare R2**: `blobs/sha256/<hash>`, każdy plik osobno, nic nie jest nadpisywane
- **GHCR** (zapas): `ghcr.io/glothriel/andreas-images:<galeria>-<hash>`, jeden tar na galerię

Co należy do strony, mówi `images.lock.json` (commitowany). Wszystko obsługuje
`scripts/images` (rclone i oras lecą z Dockera, nic nie trzeba instalować).
Zmniejszanie pod web robi Hugo przy buildzie (lokalnie i na GHA), nic z tego nie trafia do gita.

## Na świeżym klonie

```sh
make serve        # pobiera obrazki (scripts/images pull), potem hugo server na :1313
make build        # to samo, ale jednorazowy build do public/
```

`pull` bierze kolejno: lokalny cache `.images-cache/`, R2, GHCR. Hasła do R2 są w Bitwardenie
(`andreas-r2`), `bin/bwx` zapyta o master password.

## Nowa galeria / nowe obrazki

1. `make images-pull`, żeby mieć komplet lokalnie (bez tego `push` odmówi)
2. Utwórz `content/page/<nazwa>/index.md` i wrzuć obok obrazki. Galerię w treści robi się tak:

   ```
   {{< gallery >}}
     {{% galimg target="1.jpg" title="Tytuł" %}}Podpis w lightboxie{{% /galimg %}}
   {{< /gallery >}}
   ```

   Miniatura domyślnie `200x150 smart` (`size=`, `mode=fill|fit|resize`), a lightbox
   dostaje webp do 2400px (`full=`). Oryginały nigdy nie trafiają na stronę.
   Wpis w menu: zobacz front matter `content/page/grandchildren/index.md`.
3. `make serve` i sprawdź, że wygląda OK
4. `make images-push`: wysyła nowe pliki do R2 i GHCR, aktualizuje `images.lock.json`
5. `git add content/page/<nazwa>/index.md images.lock.json && git commit && git push`

Zmiana lub podmiana obrazka działa tak samo: podmień plik, `make images-push`, commit locka.
Usunięcie: skasuj plik, `scripts/images push --prune`.
`make images-status` pokazuje, co się różni od locka.

## Jednorazowe rzeczy, gdyby coś przestało działać

- **Push na GHCR** wymaga tokena `gh` z `write:packages`: `gh auth refresh -h github.com -s write:packages`
- **CI** czyta R2 z sekretów repo `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
  i `R2_BUCKET`. Bez nich bierze obrazki z GHCR przez `GITHUB_TOKEN`.
  Ustawienie z Bitwardena:
  ```sh
  item=$(bin/bwx item andreas-r2)
  jq -j '.login.uris[0].uri'  <<<"$item" | gh secret set R2_ENDPOINT
  jq -j '.login.username'     <<<"$item" | gh secret set R2_ACCESS_KEY_ID
  jq -j '.login.password'     <<<"$item" | gh secret set R2_SECRET_ACCESS_KEY
  jq -j '.fields[]|select(.name=="bucket").value' <<<"$item" | gh secret set R2_BUCKET
  ```
- **Wymagania lokalnie**: docker, python3, `bw` (Bitwarden CLI, zalogowany), `gh`.
