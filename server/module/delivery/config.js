const path = require('path');
const fs = require('fs');
const mkdirp = require('mkdirp');

const documentDir = 'public/documents/';
const fullDocumentPath = path.resolve(documentDir);

if (!fs.existsSync(fullDocumentPath)) {
  mkdirp.sync(fullDocumentPath);
}

if (!fs.existsSync(fullDocumentPath)) {
  mkdirp.sync(fullDocumentPath);
}

const logoDir = 'public/logo/';
const fullLogoPath = path.resolve(logoDir);

if (!fs.existsSync(fullLogoPath)) {
  mkdirp.sync(fullLogoPath);
}

module.exports = {
  documentDir,
  logoDir
};
