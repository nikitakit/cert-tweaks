# cert-tweaks

An Atom package that enables adding extra certificates to Atom's trust store.

Atom is built on web technologies, and can be extended with packages that connect to servers on the Internet. Unlike your browser, however, Atom provides no facilities for managing certificate authorities. The default settings trust a collection of well-known certificate authorities, but not any self-signed/custom certificates issued by you or your organization. This package lets you specify PEM files that Atom should trust in addition to its existing list of certificate authorities.

The additional certificates you specify will be trusted globally throughout Atom (to the maximum extent possible), so these settings will affect other packages.

The inspiration behind creating cert-tweaks was to allow the `Hydrogen` package to securely connect to self-hosted servers that use self-signed certificates.
