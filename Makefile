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

stamp-build: $(wildcard  src/*)
	touch $@;
	mkdir -p $(BUILDDIR)/kanso
	cp -R bin node_modules scripts project src package.json $(BUILDDIR)/kanso

test:
	./scripts/run_tests.sh test

docs:
	rm -rf www
	mkdir -p www
	mkdir -p www/guides
	cp -R docs/CNAME docs/css docs/images www
	cp -R docs/guides/images www/guides
	$(NODEJS) docs/build_docs.js

install: build
	cp -Ra $(BUILDDIR)/kanso $(NODEJSLIBDIR)
	ln -sf $(NODEJSLIBDIR)/$(PACKAGE)/bin/kanso $(BINDIR)/kanso

autocomplete:
	$(NODEJS) scripts/install_autocomp.js "$(NODEJSLIBDIR)/kanso"

uninstall:
	rm -rf $(NODEJSLIBDIR)/kanso $(NODEJSLIBDIR)/kanso.js $(BINDIR)/kanso

clean:
	rm -rf $(BUILDDIR) stamp-build

reinstall: uninstall clean install

lint:
	nodelint --config nodelint.cfg ./bin/kanso ./src/kanso/*.js ./testsuite/lib/*.js ./testsuite/tests/*.js

.PHONY: test install uninstall build all clean lint docs autocomplete
