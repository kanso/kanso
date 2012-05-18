var IgnoreReader = require("fstream-ignore"),
    inherits = require("inherits"),
    path = require("path"),
    env = require('./env');

module.exports = Packer;
inherits(Packer, IgnoreReader);

/**
 * A directory stream that collects up files and folders to be included in a package.
 * @param {String|Object} props - if an Object then a hash of properties for this packaging, if a string then the path to the folder to pack
 */
function Packer (props) {
  // If called without new then do it now
  if (!(this instanceof Packer)) {
    return new Packer(props);
  }

  // If props is a string then wrap it up in an object hash
  if (typeof props === "string") {
    props = { path: props };
  }

  // The Packer will ignore paths in these files
  props.ignoreFiles = [ ".kansoignore"];

  // Call the prototype from which the Packer is inheriting
  IgnoreReader.call(this, props);

  // files should *always* get into tarballs in a user-writable state, even if they're being installed from some wackey vm-mounted read-only filesystem.
  this.on("entryStat", function (entry, props) {
    entry.mode = props.mode = props.mode | 0200;
  });

}

/**
 * We override applyIgnores to ignore certain files
 */
Packer.prototype.applyIgnores = function (entry, partial, entryObj) {
  // package.json files can never be ignored.
  if (entry === "package.json") return true;
  // special rules for packages.  see below.
  if (entry === "packages") return true;

  // some files are *never* allowed under any circumstances
  if (entry === ".git" ||
      entry === ".lock-wscript" ||
      entry.match(/^\.wafpickle-[0-9]+$/) ||
      entry === "CVS" ||
      entry === ".svn" ||
      entry === ".hg" ||
      entry.match(/^\..*\.swp$/) ||
      entry === ".DS_Store" ||
      entry.match(/^\._/) ||
      entry === "npm-debug.log" ||
      entry === '.gitignore' ||
      entry === '.gitmodules' ||
      entry === '.*.swp' // vim swp files
    ) {
    return false;
  }

  if (this.basename === "packages") {
    // bubbling up.  stop here and allow anything the bundled pkg allows
    if (entry.indexOf(env.osSep) !== -1) return true;
  }
  return true;

};


/**
 * Ensure children are read correctly
 */
Packer.prototype.getChildProps = function (stat) {
  var props = IgnoreReader.prototype.getChildProps.call(this, stat);

  // Directories have to be read as Packers
  // otherwise fstream.Reader will create a DirReader instead.
  if (stat.isDirectory()) {
    props.type = this.constructor;
  }

  // only follow symbolic links directly in the node_modules folder.
  props.follow = false;
  return props;
};


Packer.prototype.emitEntry = function (entry) {
  if (this._paused) {
    this.once("resume", this.emitEntry.bind(this, entry));
    return;
  }

  // skip over symbolic links
  if (entry.type === "SymbolicLink") {
    entry.abort();
    return;
  }

  if (entry.type !== "Directory") {
    return IgnoreReader.prototype.emitEntry.call(this, entry);
  }


  // we don't want empty directories to show up in package
  // tarballs.
  // don't emit entry events for dirs, but still walk through
  // and read them.  This means that we need to proxy up their
  // entry events so that those entries won't be missed, since
  // .pipe() doesn't do anythign special with "child" events, on
  // with "entry" events.
  var me = this;
  entry.on("entry", function (e) {
    if (e.parent === entry) {
      e.parent = me;
      me.emit("entry", e);
    }
  });
  entry.on("package", this.emit.bind(this, "package"));
};