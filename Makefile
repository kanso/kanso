PACKAGE = kanso
NODEJS = $(if $(shell test -f /usr/bin/nodejs && echo "true"),nodejs,node)

PREFIX ?= /usr/local
BINDIR ?= $(PREFIX)/bin
DATADIR ?= $(PREFIX)/share
LIBDIR ?= $(PREFIX)/lib
NODEJSLIBDIR ?= $(LIBDIR)/$(NODEJS)

BUILDDIR = dist

$(shell if [ ! -d $(BUILDDIR) ]; then mkdir $(BUILDDIR); fi)

all: build

build: stamp-build

stamp-build: $(wildcard  deps/* lib/*.js)
	touch $@;
	mkdir -p $(BUILDDIR)/kanso
	cp -R bin deps project static commonjs lib admin package.json $(BUILDDIR)/kanso
	printf '#!/bin/sh\n$(NODEJS) $(NODEJSLIBDIR)/$(PACKAGE)/bin/kanso $$@' > $(BUILDDIR)/kanso.sh

test:
	nodeunit test

install: build
	#install --directory $(NODEJSLIBDIR)
	cp -Ra $(BUILDDIR)/kanso $(NODEJSLIBDIR)
	install -m 0755 $(BUILDDIR)/kanso.sh $(BINDIR)/kanso

uninstall:
	rm -rf $(NODEJSLIBDIR)/kanso $(NODEJSLIBDIR)/kanso.js $(BINDIR)/kanso

clean:
	rm -rf $(BUILDDIR) stamp-build

lint:
	nodelint --config nodelint.cfg ./bin/kanso ./commonjs/kanso/*.js ./lib/*.js ./static/kanso.js

.PHONY: test install uninstall build all clean lint
