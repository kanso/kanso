PACKAGE = kanso
NODEJS = $(if $(shell test -f /usr/bin/nodejs && echo "true"),nodejs,node)

PREFIX ?= /usr/local
BINDIR ?= $(PREFIX)/bin
DATADIR ?= $(PREFIX)/share
LIBDIR ?= $(PREFIX)/lib
NODEJSLIBDIR ?= $(LIBDIR)/$(NODEJS)

BUILDDIR = dist

COMMONJSFILES = $(shell find ./commonjs/kanso/*.js | grep -v ./commonjs/kanso/sha1.js | grep -v ./commonjs/kanso/underscore.js)

$(shell if [ ! -d $(BUILDDIR) ]; then mkdir $(BUILDDIR); fi)

all: build

submodules:
	git submodule update --init --recursive

build: submodules stamp-build

stamp-build: $(wildcard  deps/* lib/*.js)
	touch $@;
	mkdir -p $(BUILDDIR)/kanso
	cp -R bin deps project static commonjs lib admin package.json $(BUILDDIR)/kanso
	printf '#!/bin/sh\n$(NODEJS) $(NODEJSLIBDIR)/$(PACKAGE)/bin/kanso $$@' > $(BUILDDIR)/kanso.sh

test:
	nodeunit test

docs:
	rm -rf www
	mkdir -p www
	mkdir -p www/guides
	cp -R docs/CNAME docs/css docs/images www
	cp -R docs/guides/images www/guides
	$(NODEJS) docs/build_docs.js

install: build
	#install --directory $(NODEJSLIBDIR)
	cp -Ra $(BUILDDIR)/kanso $(NODEJSLIBDIR)
	install -m 0755 $(BUILDDIR)/kanso.sh $(BINDIR)/kanso

uninstall:
	rm -rf $(NODEJSLIBDIR)/kanso $(NODEJSLIBDIR)/kanso.js $(BINDIR)/kanso

clean:
	rm -rf $(BUILDDIR) stamp-build

lint:
	nodelint --config nodelint.cfg ./bin/kanso $(COMMONJSFILES) ./lib/*.js ./static/kanso.js ./admin/lib/*.js ./testsuite/lib/*.js ./testsuite/tests/*.js

.PHONY: test install uninstall build all clean lint docs
