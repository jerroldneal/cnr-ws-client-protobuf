'use strict';

const protobuf = require('protobufjs');

/**
 * Schema registry — lazily builds and caches protobufjs Type instances.
 * All modules share this single registry to avoid duplicate schema definitions.
 */

const root = new protobuf.Root();

// Track which types have been defined
const defined = new Set();

function defineType(name, fieldDefs) {
  if (defined.has(name)) return root.lookupType(name);
  const type = new protobuf.Type(name);
  for (const f of fieldDefs) {
    const field = new protobuf.Field(f.name, f.id, f.type, f.rule || undefined);
    type.add(field);
  }
  root.add(type);
  defined.add(name);
  return type;
}

function getType(name) {
  return root.lookupType(name);
}

module.exports = { root, defineType, getType };
