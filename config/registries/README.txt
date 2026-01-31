LOCAL REGISTRY FILES
====================

Place static registry JSON files here to replace IPFS remote fetching.

File naming: {CID}.json
Example: QmXbfEAaR7D2Ujm4GAkbwcGZQMHqAMpwDoje4583uNP834.json

These files are read by the security-patched IPFS client instead of
fetching from remote gateways (gateway.pinata.cloud, ipfs.io, etc.).

The known CIDs from the original codebase are:
- QmXbfEAaR7D2Ujm4GAkbwcGZQMHqAMpwDoje4583uNP834 (Plugin Registry)
- QmNr1yYMKi7YBaL8JSztQyuB5ZUaTdRMLxJC1pBpGbjsTc (Model Registry)

To populate these files, you can manually download from an IPFS gateway
once for verification, then save them here permanently:

  curl -o QmXbfEAaR7D2Ujm4GAkbwcGZQMHqAMpwDoje4583uNP834.json \
    "https://gateway.pinata.cloud/ipfs/QmXbfEAaR7D2Ujm4GAkbwcGZQMHqAMpwDoje4583uNP834"

After verification, all subsequent reads will be purely local.
