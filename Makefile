.PHONY: serve build clean

# Start development server
serve:
	docker compose up

# Build the site
build:
	docker compose run --rm hugo --minify

# Clean generated files
clean:
	rm -rf public resources/_gen

# Enter hugo container shell
shell:
	docker compose run --rm hugo sh

