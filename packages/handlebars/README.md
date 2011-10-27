The handlebars module has been modified to export the Handlebars object instead
of node-specific functions when used as a CommonJS Module. Also, the 'vm'
module originally had no CommonJS exports, it now exports the Handlebars object.
