.PHONY: serve build clean shell images-pull images-push images-status

# docker-compose.yml runs hugo as this user
export UID := $(shell id -u)
export GID := $(shell id -g)

# Start development server
serve: images-pull
	docker compose up

# Build the site
build: images-pull
	docker compose run --rm hugo --minify

# Fetch gallery originals listed in images.lock.json (R2, falling back to GHCR)
images-pull:
	scripts/images pull

# Upload new/changed gallery images to R2 + GHCR and update images.lock.json
images-push:
	scripts/images push

# Compare images on disk with images.lock.json
images-status:
	scripts/images status

# Clean generated files
clean:
	rm -rf public/* resources/_gen

# Enter hugo container shell
shell:
	docker compose run --rm hugo sh
