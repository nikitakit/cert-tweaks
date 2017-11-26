'use babel';

import fs from "fs";
import https from "https";
import { CompositeDisposable } from 'atom';


export default {
  config: {
    extraCerts : {
      order: 1,
      title: "Additional certificate files",
      description:
        "A list of files containing additional certificates that should be trusted as root certificate authorities. This should be a comma-separated list, and each element should be an absolute path to a file in the PEM format. To trust a self-signed certificate, the certificate itself should be added here.",
      default: [],
      type: "array",
      items:{
        type: 'string'
      }
    },
    emulateExtraCACerts: {
      order: 2,
      title: "Emulate NODE_EXTRA_CA_CERTS functionality",
      description:
        "Standalone nodejs starting with version 7.3.0 supports a `NODE_EXTRA_CA_CERTS` environment variable, but as of November 2017 no version of Atom has supported this variable. When this setting is enabled, this package will ensure that certificates from `NODE_EXTRA_CA_CERTS` are added to Atom's certificate store.",
      type: "boolean",
      default: false
    },
  },

  subscriptions: null,
  certData: [],
  patched: false,
  NativeSecureContext: null,
  oldAddRootCerts: null,

  activate(state) {
    this.populateFromSettings();
    this.subscriptions = new CompositeDisposable();

    this.subscriptions.add(atom.config.onDidChange(
      "cert-tweaks.extraCerts", this.populateFromSettings.bind(this)));
    this.subscriptions.add(atom.config.onDidChange(
      "cert-tweaks.emulateExtraCACerts", this.populateFromSettings.bind(this)));
  },

  readCertFile(path) {
    try {
      return fs.readFileSync(path);
    } catch (e) {
      atom.notifications.addError("Unable to read certificate file", {
        detail: `The cert-tweaks package has failed to read the file: "${path}"`,
        stack: e,
      });
      return null;
    }
  },

  populateFromSettings() {
    // Clear past certificate data
    this.certData.length = 0;

    const emulateExtraCACerts = (atom.config.get(`cert-tweaks.emulateExtraCACerts`) === true);
    const extraCerts = atom.config.get(`cert-tweaks.extraCerts`);

    if (emulateExtraCACerts && !!process.env.NODE_EXTRA_CA_CERTS) {
      let cert = this.readCertFile(process.env.NODE_EXTRA_CA_CERTS);
      if (cert) {
        this.certData.push(cert);
      }
    }

    for (let file of extraCerts) {
      let cert = this.readCertFile(file);
      if (cert !== null) {
        this.certData.push(cert);
      }
    }

    if (!this.patched) {
      this.patch();
    }
  },

  patch(certData) {
    const self = this;

    if (self.patched) {
      atom.notifications.addError("cert-tweaks package internal error", {
        detail: "Attempt to call cert-tweaks patch() function twice"
      })
      return;
    }


    self.NativeSecureContext = process.binding('crypto').SecureContext;
  	self.oldAddRootCerts = self.NativeSecureContext.prototype.addRootCerts;
  	self.NativeSecureContext.prototype.addRootCerts = function() {
  		var ret = self.oldAddRootCerts.apply(this, arguments);
      for (let el of self.certData) {
        this.addCACert(el);
      }
  		return ret;
  	};
    self.patched = true;
  },

  unpatch() {
    if (!this.patched) {
      return;
    }

    this.NativeSecureContext.prototype.addRootCerts = this.oldAddRootCerts;
    this.NativeSecureContext = null;
    this.oldAddRootCerts = null;
    this.patched = false;
  },

  deactivate() {
    this.unpatch();
    this.subscriptions.dispose();
  },
};
