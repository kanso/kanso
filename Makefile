PACKAGE = kanso
NODEJS = $(if $(shell test -f /usr/bin/nodejs && echo "true"),nodejs,node)

PREFIX ?= /usr/local
BINDIR ?= $(PREFIX)/bin
DATADIR ?= $(PREFIX)/share
LIBDIR ?= $(PREFIX)/lib
NODEJSLIBDIR ?= $(LIBDIR)/$(NODEJS)

BUILDDIR = dist

COMMONJSFILES = $(shell find ./packages | grep /*.js$$ | grep -v ./packages/kanso.sha1/kanso/sha1.js | grep -v ./packages/underscore/underscore.js)

$(shell if [ ! -d $(BUILDDIR) ]; then mkdir $(BUILDDIR); fi)

all: build

submodules:
	git submodule update --init --recursive

build: submodules stamp-build

stamp-build: $(wildcard  deps/* lib/*.js)
	touch $@;
	mkdir -p $(BUILDDIR)/kanso
	cp -R bin scripts project packages lib admin package.json $(BUILDDIR)/kanso
	tar --exclude='.git' -c -f - deps | (cd $(BUILDDIR)/kanso ; tar xfp -)

test:
	./scripts/run_tests.js test

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
	ln -sf $(NODEJSLIBDIR)/$(PACKAGE)/bin/kanso $(BINDIR)/kanso

uninstall:
	rm -rf $(NODEJSLIBDIR)/kanso $(NODEJSLIBDIR)/kanso.js $(BINDIR)/kanso

clean:
	rm -rf $(BUILDDIR) stamp-build

lint:
	nodelint --config nodelint.cfg ./bin/kanso $(COMMONJSFILES) ./lib/*.js ./admin/lib/*.js ./testsuite/lib/*.js ./testsuite/tests/*.js

.PHONY: test install uninstall build all clean lint docs
