// src/storage/storage.ts
var DefaultFetchClient = class {
  fetch(url, init) {
    return globalThis.fetch(url, init);
  }
};
var NotFoundError = class extends Error {
  constructor(path) {
    super(`Object not found: ${path}`);
    this.path = path;
    this.name = "NotFoundError";
  }
};
var StorageError = class extends Error {
  constructor(message, cause) {
    super(message);
    this.cause = cause;
    this.name = "StorageError";
  }
};
function hasErrorName(error) {
  return typeof error === "object" && error !== null && "name" in error;
}
function isAbortError(error) {
  return hasErrorName(error) && error.name === "AbortError";
}

// src/format/constants.ts
var PATHS = {
  /** Refs directory */
  REFS: "refs",
  /** Snapshots directory */
  SNAPSHOTS: "snapshots",
  /** Manifests directory */
  MANIFESTS: "manifests",
  /** Chunks directory */
  CHUNKS: "chunks",
  /** Transaction logs directory */
  TRANSACTIONS: "transactions"
};
var REPO_INFO_PATH = "repo";
function getBranchRefDirPath(name) {
  return `${PATHS.REFS}/branch.${name}/`;
}
function getTagRefDirPath(name) {
  return `${PATHS.REFS}/tag.${name}/`;
}
var REF_FILE_NAME = "ref.json";
function getBranchRefPath(name) {
  return `${PATHS.REFS}/branch.${name}/${REF_FILE_NAME}`;
}
function getTagRefPath(name) {
  return `${PATHS.REFS}/tag.${name}/${REF_FILE_NAME}`;
}
function getSnapshotPath(id) {
  return `${PATHS.SNAPSHOTS}/${id}`;
}
function getManifestPath(id) {
  return `${PATHS.MANIFESTS}/${id}`;
}
function getChunkPath(id) {
  return `${PATHS.CHUNKS}/${id}`;
}
function getTransactionLogPath(id) {
  return `${PATHS.TRANSACTIONS}/${id}`;
}

// src/format/object-id.ts
var ENCODE_ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ";
var DECODE_MAP = {};
for (let i = 0; i < ENCODE_ALPHABET.length; i++) {
  const char = ENCODE_ALPHABET[i];
  DECODE_MAP[char] = i;
  DECODE_MAP[char.toLowerCase()] = i;
}
DECODE_MAP["I"] = DECODE_MAP["i"] = 1;
DECODE_MAP["L"] = DECODE_MAP["l"] = 1;
DECODE_MAP["O"] = DECODE_MAP["o"] = 0;
function encodeBase32(bytes) {
  if (bytes.length === 0) return "";
  let result = "";
  let buffer = 0;
  let bitsLeft = 0;
  for (const byte of bytes) {
    buffer = buffer << 8 | byte;
    bitsLeft += 8;
    while (bitsLeft >= 5) {
      bitsLeft -= 5;
      const index = buffer >> bitsLeft & 31;
      result += ENCODE_ALPHABET[index];
    }
  }
  if (bitsLeft > 0) {
    const index = buffer << 5 - bitsLeft & 31;
    result += ENCODE_ALPHABET[index];
  }
  return result;
}
function decodeBase32(str) {
  if (str.length === 0) return new Uint8Array(0);
  str = str.replace(/-/g, "");
  const result = [];
  let buffer = 0;
  let bitsLeft = 0;
  for (const char of str) {
    const value = DECODE_MAP[char];
    if (value === void 0) {
      throw new Error(`Invalid Base32 Crockford character: ${char}`);
    }
    buffer = buffer << 5 | value;
    bitsLeft += 5;
    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      result.push(buffer >> bitsLeft & 255);
    }
  }
  return new Uint8Array(result);
}
function encodeObjectId12(id) {
  if (id.length !== 12) {
    throw new Error(`Expected 12 bytes, got ${id.length}`);
  }
  return encodeBase32(id);
}
function decodeObjectId12(str) {
  const bytes = decodeBase32(str);
  if (bytes.length !== 12) {
    throw new Error(`Expected 12 bytes after decoding, got ${bytes.length}`);
  }
  return bytes;
}
function encodeObjectId8(id) {
  if (id.length !== 8) {
    throw new Error(`Expected 8 bytes, got ${id.length}`);
  }
  return encodeBase32(id);
}
function decodeObjectId8(str) {
  const bytes = decodeBase32(str);
  if (bytes.length !== 8) {
    throw new Error(`Expected 8 bytes after decoding, got ${bytes.length}`);
  }
  return bytes;
}

// src/format/flatbuffers/repo-parser.ts
import { ByteBuffer } from "flatbuffers";
import * as flexbuffers from "flatbuffers/js/flexbuffers.js";

// src/format/flatbuffers/generated/metadata-item.ts
var MetadataItem = class _MetadataItem {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsMetadataItem(bb, obj) {
    return (obj || new _MetadataItem()).__init(
      bb.readInt32(bb.position()) + bb.position(),
      bb
    );
  }
  name(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
  }
  value(index) {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.readUint8(this.bb.__vector(this.bb_pos + offset) + index) : 0;
  }
  valueLength() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  valueArray() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? new Uint8Array(
      this.bb.bytes().buffer,
      this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset),
      this.bb.__vector_len(this.bb_pos + offset)
    ) : null;
  }
};

// src/format/flatbuffers/generated/ref.ts
var Ref = class _Ref {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsRef(bb, obj) {
    return (obj || new _Ref()).__init(
      bb.readInt32(bb.position()) + bb.position(),
      bb
    );
  }
  name(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
  }
  snapshotIndex() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.readUint32(this.bb_pos + offset) : 0;
  }
};

// src/format/flatbuffers/generated/repo-status.ts
var RepoStatus = class _RepoStatus {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsRepoStatus(bb, obj) {
    return (obj || new _RepoStatus()).__init(
      bb.readInt32(bb.position()) + bb.position(),
      bb
    );
  }
  availability() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readUint8(this.bb_pos + offset) : 0 /* Online */;
  }
  setAt() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.readUint64(this.bb_pos + offset) : BigInt("0");
  }
  limitedAvailabilityReason(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
  }
};

// src/format/flatbuffers/generated/object-id12.ts
var ObjectId12 = class {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  bytes(index) {
    return this.bb.readUint8(this.bb_pos + 0 + index);
  }
  static sizeOf() {
    return 12;
  }
};

// src/format/flatbuffers/generated/snapshot-info.ts
var SnapshotInfo = class _SnapshotInfo {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsSnapshotInfo(bb, obj) {
    return (obj || new _SnapshotInfo()).__init(
      bb.readInt32(bb.position()) + bb.position(),
      bb
    );
  }
  id(obj) {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? (obj || new ObjectId12()).__init(this.bb_pos + offset, this.bb) : null;
  }
  parentOffset() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.readInt32(this.bb_pos + offset) : 0;
  }
  flushedAt() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.readUint64(this.bb_pos + offset) : BigInt("0");
  }
  message(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
  }
  metadata(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 12);
    return offset ? (obj || new MetadataItem()).__init(
      this.bb.__indirect(
        this.bb.__vector(this.bb_pos + offset) + index * 4
      ),
      this.bb
    ) : null;
  }
  metadataLength() {
    const offset = this.bb.__offset(this.bb_pos, 12);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
};

// src/format/flatbuffers/generated/update.ts
var Update = class _Update {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsUpdate(bb, obj) {
    return (obj || new _Update()).__init(
      bb.readInt32(bb.position()) + bb.position(),
      bb
    );
  }
  updateTypeType() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readUint8(this.bb_pos + offset) : 0 /* NONE */;
  }
  updateType(obj) {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.__union(obj, this.bb_pos + offset) : null;
  }
  updatedAt() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.readUint64(this.bb_pos + offset) : BigInt("0");
  }
  backupPath(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
  }
};

// src/format/flatbuffers/generated/repo.ts
var Repo = class _Repo {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsRepo(bb, obj) {
    return (obj || new _Repo()).__init(
      bb.readInt32(bb.position()) + bb.position(),
      bb
    );
  }
  specVersion() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readUint8(this.bb_pos + offset) : 0;
  }
  tags(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? (obj || new Ref()).__init(
      this.bb.__indirect(
        this.bb.__vector(this.bb_pos + offset) + index * 4
      ),
      this.bb
    ) : null;
  }
  tagsLength() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  branches(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? (obj || new Ref()).__init(
      this.bb.__indirect(
        this.bb.__vector(this.bb_pos + offset) + index * 4
      ),
      this.bb
    ) : null;
  }
  branchesLength() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  deletedTags(index, optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.__string(
      this.bb.__vector(this.bb_pos + offset) + index * 4,
      optionalEncoding
    ) : null;
  }
  deletedTagsLength() {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  snapshots(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 12);
    return offset ? (obj || new SnapshotInfo()).__init(
      this.bb.__indirect(
        this.bb.__vector(this.bb_pos + offset) + index * 4
      ),
      this.bb
    ) : null;
  }
  snapshotsLength() {
    const offset = this.bb.__offset(this.bb_pos, 12);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  status(obj) {
    const offset = this.bb.__offset(this.bb_pos, 14);
    return offset ? (obj || new RepoStatus()).__init(
      this.bb.__indirect(this.bb_pos + offset),
      this.bb
    ) : null;
  }
  metadata(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 16);
    return offset ? (obj || new MetadataItem()).__init(
      this.bb.__indirect(
        this.bb.__vector(this.bb_pos + offset) + index * 4
      ),
      this.bb
    ) : null;
  }
  metadataLength() {
    const offset = this.bb.__offset(this.bb_pos, 16);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  latestUpdates(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 18);
    return offset ? (obj || new Update()).__init(
      this.bb.__indirect(
        this.bb.__vector(this.bb_pos + offset) + index * 4
      ),
      this.bb
    ) : null;
  }
  latestUpdatesLength() {
    const offset = this.bb.__offset(this.bb_pos, 18);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  repoBeforeUpdates(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 20);
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
  }
  config(index) {
    const offset = this.bb.__offset(this.bb_pos, 22);
    return offset ? this.bb.readUint8(this.bb.__vector(this.bb_pos + offset) + index) : 0;
  }
  configLength() {
    const offset = this.bb.__offset(this.bb_pos, 22);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  configArray() {
    const offset = this.bb.__offset(this.bb_pos, 22);
    return offset ? new Uint8Array(
      this.bb.bytes().buffer,
      this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset),
      this.bb.__vector_len(this.bb_pos + offset)
    ) : null;
  }
  enabledFeatureFlags(index) {
    const offset = this.bb.__offset(this.bb_pos, 24);
    return offset ? this.bb.readUint16(this.bb.__vector(this.bb_pos + offset) + index * 2) : 0;
  }
  enabledFeatureFlagsLength() {
    const offset = this.bb.__offset(this.bb_pos, 24);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  enabledFeatureFlagsArray() {
    const offset = this.bb.__offset(this.bb_pos, 24);
    return offset ? new Uint16Array(
      this.bb.bytes().buffer,
      this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset),
      this.bb.__vector_len(this.bb_pos + offset)
    ) : null;
  }
  disabledFeatureFlags(index) {
    const offset = this.bb.__offset(this.bb_pos, 26);
    return offset ? this.bb.readUint16(this.bb.__vector(this.bb_pos + offset) + index * 2) : 0;
  }
  disabledFeatureFlagsLength() {
    const offset = this.bb.__offset(this.bb_pos, 26);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  disabledFeatureFlagsArray() {
    const offset = this.bb.__offset(this.bb_pos, 26);
    return offset ? new Uint16Array(
      this.bb.bytes().buffer,
      this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset),
      this.bb.__vector_len(this.bb_pos + offset)
    ) : null;
  }
  extra(index) {
    const offset = this.bb.__offset(this.bb_pos, 28);
    return offset ? this.bb.readUint8(this.bb.__vector(this.bb_pos + offset) + index) : 0;
  }
  extraLength() {
    const offset = this.bb.__offset(this.bb_pos, 28);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  extraArray() {
    const offset = this.bb.__offset(this.bb_pos, 28);
    return offset ? new Uint8Array(
      this.bb.bytes().buffer,
      this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset),
      this.bb.__vector_len(this.bb_pos + offset)
    ) : null;
  }
};

// src/format/flatbuffers/repo-parser.ts
import { decompress } from "fzstd";

// src/format/header.ts
var HEADER_SIZE = 39;
var MAGIC_BYTES = new Uint8Array([
  73,
  67,
  69,
  // ICE
  240,
  159,
  167,
  138,
  // 🧊 (U+1F9CA in UTF-8)
  67,
  72,
  85,
  78,
  75
  // CHUNK
]);
var SpecVersion = /* @__PURE__ */ ((SpecVersion3) => {
  SpecVersion3[SpecVersion3["V1_0"] = 1] = "V1_0";
  SpecVersion3[SpecVersion3["V2_0"] = 2] = "V2_0";
  return SpecVersion3;
})(SpecVersion || {});
var FileType = /* @__PURE__ */ ((FileType2) => {
  FileType2[FileType2["Snapshot"] = 1] = "Snapshot";
  FileType2[FileType2["Manifest"] = 2] = "Manifest";
  FileType2[FileType2["Attributes"] = 3] = "Attributes";
  FileType2[FileType2["TransactionLog"] = 4] = "TransactionLog";
  FileType2[FileType2["Chunk"] = 5] = "Chunk";
  FileType2[FileType2["RepoInfo"] = 6] = "RepoInfo";
  return FileType2;
})(FileType || {});
var CompressionAlgorithm = /* @__PURE__ */ ((CompressionAlgorithm2) => {
  CompressionAlgorithm2[CompressionAlgorithm2["None"] = 0] = "None";
  CompressionAlgorithm2[CompressionAlgorithm2["Zstd"] = 1] = "Zstd";
  return CompressionAlgorithm2;
})(CompressionAlgorithm || {});
var HeaderParseError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "HeaderParseError";
  }
};
function parseHeader(data) {
  if (data.length < HEADER_SIZE) {
    throw new HeaderParseError(
      `Buffer too small: expected at least ${HEADER_SIZE} bytes, got ${data.length}`
    );
  }
  const magic = data.slice(0, 12);
  if (!compareMagic(magic, MAGIC_BYTES)) {
    throw new HeaderParseError("Invalid magic bytes: not an icechunk file");
  }
  const implementationBytes = data.slice(12, 36);
  const implementation = new TextDecoder().decode(implementationBytes).trimEnd();
  const specVersionByte = data[36];
  if (specVersionByte !== 1 /* V1_0 */ && specVersionByte !== 2 /* V2_0 */) {
    throw new HeaderParseError(`Invalid spec version: ${specVersionByte}`);
  }
  const specVersion = specVersionByte;
  const fileTypeByte = data[37];
  if (fileTypeByte < 1 || fileTypeByte > 6) {
    throw new HeaderParseError(`Invalid file type: ${fileTypeByte}`);
  }
  const fileType = fileTypeByte;
  const compressionByte = data[38];
  if (compressionByte !== 0 /* None */ && compressionByte !== 1 /* Zstd */) {
    throw new HeaderParseError(
      `Invalid compression algorithm: ${compressionByte}`
    );
  }
  const compression = compressionByte;
  return {
    implementation,
    specVersion,
    fileType,
    compression
  };
}
function validateFileType(header, expectedType) {
  if (header.fileType !== expectedType) {
    const expected = FileType[expectedType];
    const actual = FileType[header.fileType];
    throw new HeaderParseError(
      `Invalid file type: expected ${expected}, got ${actual}`
    );
  }
}
function getDataAfterHeader(data) {
  return data.slice(HEADER_SIZE);
}
function compareMagic(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i]) return false;
  }
  return true;
}

// src/format/flatbuffers/repo-parser.ts
var SUPPORTED_SPEC_VERSION = 2;
function parseRepo(data) {
  if (data.length < HEADER_SIZE) {
    throw new Error(
      `Repo file too small: ${data.length} bytes, need at least ${HEADER_SIZE}`
    );
  }
  const header = parseHeader(data);
  validateFileType(header, 6 /* RepoInfo */);
  let fbData = getDataAfterHeader(data);
  if (header.compression === 1 /* Zstd */) {
    fbData = decompress(fbData);
  }
  const bb = new ByteBuffer(fbData);
  const repo = Repo.getRootAsRepo(bb);
  const specVersion = repo.specVersion();
  if (specVersion !== SUPPORTED_SPEC_VERSION) {
    throw new Error(
      `Unsupported repo spec version: ${specVersion}, expected ${SUPPORTED_SPEC_VERSION}`
    );
  }
  const snapshotsLength = repo.snapshotsLength();
  const virtualChunkContainers = parseVirtualChunkContainers(repo);
  return { repo, specVersion, snapshotsLength, virtualChunkContainers };
}
function parseVirtualChunkContainers(repo) {
  const result = /* @__PURE__ */ new Map();
  const configBytes = repo.configArray();
  if (!configBytes || configBytes.length === 0) return result;
  let config;
  try {
    const ab = configBytes.buffer.slice(
      configBytes.byteOffset,
      configBytes.byteOffset + configBytes.byteLength
    );
    config = flexbuffers.toObject(ab);
  } catch {
    return result;
  }
  if (!isRecord(config)) return result;
  const containers = config.virtual_chunk_containers;
  if (!isRecord(containers)) return result;
  for (const container of Object.values(containers)) {
    if (!isRecord(container)) continue;
    const { name, url_prefix: urlPrefix } = container;
    if (typeof name !== "string" || typeof urlPrefix !== "string") continue;
    result.set(name, urlPrefix);
  }
  return result;
}
function isRecord(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
function compareUtf8ByteOrder(aBytes, bBytes) {
  const minLen = Math.min(aBytes.length, bBytes.length);
  for (let i = 0; i < minLen; i++) {
    if (aBytes[i] < bBytes[i]) return -1;
    if (aBytes[i] > bBytes[i]) return 1;
  }
  return aBytes.length - bBytes.length;
}
function binarySearchRef(parsedRepo, accessor, length, name) {
  const { snapshotsLength } = parsedRepo;
  if (length === 0) return null;
  const targetBytes = new TextEncoder().encode(name);
  let low = 0;
  let high = length - 1;
  while (low <= high) {
    const mid = low + high >>> 1;
    const refTable = accessor(mid);
    if (!refTable) {
      throw new Error(`Corrupted repo file: null ref table at index ${mid}`);
    }
    const refName = refTable.name();
    if (refName === null) {
      throw new Error(`Corrupted repo file: null ref name at index ${mid}`);
    }
    const refNameBytes = new TextEncoder().encode(refName);
    const cmp = compareUtf8ByteOrder(refNameBytes, targetBytes);
    if (cmp < 0) {
      low = mid + 1;
    } else if (cmp > 0) {
      high = mid - 1;
    } else {
      const snapshotIndex = refTable.snapshotIndex();
      if (snapshotIndex >= snapshotsLength) {
        throw new Error(
          `Invalid snapshot index ${snapshotIndex} for ref '${name}', snapshots array has ${snapshotsLength} entries`
        );
      }
      return getSnapshotIdByIndex(parsedRepo, snapshotIndex);
    }
  }
  return null;
}
function getSnapshotIdByIndex(parsedRepo, index) {
  const snapshotInfo = parsedRepo.repo.snapshots(index);
  if (!snapshotInfo) {
    throw new Error(`Corrupted repo file: null snapshot at index ${index}`);
  }
  const idObj = snapshotInfo.id();
  if (!idObj) {
    throw new Error(`Corrupted repo file: snapshot ${index} missing id`);
  }
  return idObj.bb.bytes().slice(idObj.bb_pos, idObj.bb_pos + 12);
}
function listRefs(accessor, length) {
  const names = [];
  for (let i = 0; i < length; i++) {
    const refTable = accessor(i);
    if (!refTable) {
      throw new Error(`Corrupted repo file: null ref table at index ${i}`);
    }
    const name = refTable.name();
    if (name === null) {
      throw new Error(`Corrupted repo file: null ref name at index ${i}`);
    }
    names.push(name);
  }
  return names;
}
function resolveBranch(parsedRepo, name) {
  const { repo } = parsedRepo;
  return binarySearchRef(
    parsedRepo,
    (i) => repo.branches(i),
    repo.branchesLength(),
    name
  );
}
function resolveTag(parsedRepo, name) {
  const { repo } = parsedRepo;
  return binarySearchRef(
    parsedRepo,
    (i) => repo.tags(i),
    repo.tagsLength(),
    name
  );
}
function listBranchesFromRepo(parsedRepo) {
  const { repo } = parsedRepo;
  return listRefs((i) => repo.branches(i), repo.branchesLength());
}
function listTagsFromRepo(parsedRepo) {
  const { repo } = parsedRepo;
  return listRefs((i) => repo.tags(i), repo.tagsLength());
}

// src/reader/session.ts
import { decompress as decompress2 } from "fzstd";

// src/cache/lru.ts
var LRUCache = class {
  cache;
  maxSize;
  constructor(maxSize) {
    this.cache = /* @__PURE__ */ new Map();
    this.maxSize = maxSize;
  }
  get(key) {
    const value = this.cache.get(key);
    if (value !== void 0) {
      this.cache.delete(key);
      this.cache.set(key, value);
    }
    return value;
  }
  set(key, value) {
    if (this.maxSize <= 0) return;
    if (this.cache.has(key)) {
      this.cache.delete(key);
    }
    if (this.cache.size >= this.maxSize) {
      const oldestKey = this.cache.keys().next().value;
      if (oldestKey !== void 0) {
        this.cache.delete(oldestKey);
      }
    }
    this.cache.set(key, value);
  }
  has(key) {
    return this.cache.has(key);
  }
  delete(key) {
    return this.cache.delete(key);
  }
  clear() {
    this.cache.clear();
  }
  get size() {
    return this.cache.size;
  }
};

// src/cache/single-flight.ts
function singleFlight(cache) {
  const pending = /* @__PURE__ */ new Map();
  return {
    load(key, fetcher, signal) {
      if (signal?.aborted) return Promise.reject(makeAbortError());
      const hit = cache.get(key);
      if (hit !== void 0) return Promise.resolve(hit);
      let entry = pending.get(key);
      if (!entry) {
        const controller = new AbortController();
        const promise = invokeFetcher(fetcher, controller.signal).then((value) => {
          cache.set(key, value);
          return value;
        }).finally(() => {
          if (pending.get(key)?.promise === promise) pending.delete(key);
        });
        const fresh = { promise, controller, refCount: 0 };
        pending.set(key, fresh);
        entry = fresh;
      }
      const owned = entry;
      owned.refCount++;
      const release = () => {
        owned.refCount--;
        if (owned.refCount > 0) return;
        if (pending.get(key) === owned) {
          pending.delete(key);
          owned.controller.abort();
        }
      };
      if (!signal) {
        return owned.promise.then(
          (value) => {
            release();
            return value;
          },
          (error) => {
            release();
            throw error;
          }
        );
      }
      return new Promise((resolve, reject) => {
        let done = false;
        const finish = () => {
          if (done) return false;
          done = true;
          signal.removeEventListener("abort", handleAbort);
          release();
          return true;
        };
        const handleAbort = () => {
          if (finish()) reject(makeAbortError());
        };
        signal.addEventListener("abort", handleAbort, { once: true });
        owned.promise.then(
          (value) => {
            if (finish()) resolve(value);
          },
          (error) => {
            if (finish()) reject(error);
          }
        );
      });
    }
  };
}
function invokeFetcher(fetcher, signal) {
  try {
    return fetcher(signal);
  } catch (error) {
    return Promise.reject(error);
  }
}
function makeAbortError() {
  return new DOMException("The operation was aborted.", "AbortError");
}

// src/format/flatbuffers/types.ts
function asObjectId12(bytes) {
  if (bytes.length !== 12) {
    throw new Error(
      `Invalid ObjectId12: expected 12 bytes, got ${bytes.length}`
    );
  }
  return bytes;
}
function asObjectId8(bytes) {
  if (bytes.length !== 8) {
    throw new Error(`Invalid ObjectId8: expected 8 bytes, got ${bytes.length}`);
  }
  return bytes;
}

// src/format/flatbuffers/snapshot-parser.ts
import { ByteBuffer as ByteBuffer2 } from "flatbuffers";

// src/format/flatbuffers/generated/manifest-file-info.ts
var ManifestFileInfo = class {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  id(obj) {
    return (obj || new ObjectId12()).__init(this.bb_pos, this.bb);
  }
  sizeBytes() {
    return this.bb.readUint64(this.bb_pos + 16);
  }
  numChunkRefs() {
    return this.bb.readUint32(this.bb_pos + 24);
  }
  static sizeOf() {
    return 32;
  }
};

// src/format/flatbuffers/generated/manifest-file-info-v2.ts
var ManifestFileInfoV2 = class _ManifestFileInfoV2 {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsManifestFileInfoV2(bb, obj) {
    return (obj || new _ManifestFileInfoV2()).__init(
      bb.readInt32(bb.position()) + bb.position(),
      bb
    );
  }
  id(obj) {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? (obj || new ObjectId12()).__init(this.bb_pos + offset, this.bb) : null;
  }
  sizeBytes() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.readUint64(this.bb_pos + offset) : BigInt("0");
  }
  numChunkRefs() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.readUint32(this.bb_pos + offset) : 0;
  }
  extra(index) {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.readUint8(this.bb.__vector(this.bb_pos + offset) + index) : 0;
  }
  extraLength() {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  extraArray() {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? new Uint8Array(
      this.bb.bytes().buffer,
      this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset),
      this.bb.__vector_len(this.bb_pos + offset)
    ) : null;
  }
};

// src/format/flatbuffers/generated/dimension-name.ts
var DimensionName = class _DimensionName {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsDimensionName(bb, obj) {
    return (obj || new _DimensionName()).__init(
      bb.readInt32(bb.position()) + bb.position(),
      bb
    );
  }
  name(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
  }
};

// src/format/flatbuffers/generated/dimension-shape.ts
var DimensionShape = class {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  arrayLength() {
    return this.bb.readUint64(this.bb_pos);
  }
  chunkLength() {
    return this.bb.readUint64(this.bb_pos + 8);
  }
  static sizeOf() {
    return 16;
  }
};

// src/format/flatbuffers/generated/dimension-shape-v2.ts
var DimensionShapeV2 = class _DimensionShapeV2 {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsDimensionShapeV2(bb, obj) {
    return (obj || new _DimensionShapeV2()).__init(
      bb.readInt32(bb.position()) + bb.position(),
      bb
    );
  }
  arrayLength() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readUint64(this.bb_pos + offset) : BigInt("0");
  }
  numChunks() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.readUint32(this.bb_pos + offset) : 0;
  }
};

// src/format/flatbuffers/generated/chunk-index-range.ts
var ChunkIndexRange = class {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  from() {
    return this.bb.readUint32(this.bb_pos);
  }
  to() {
    return this.bb.readUint32(this.bb_pos + 4);
  }
  static sizeOf() {
    return 8;
  }
};

// src/format/flatbuffers/generated/manifest-ref.ts
var ManifestRef = class _ManifestRef {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsManifestRef(bb, obj) {
    return (obj || new _ManifestRef()).__init(
      bb.readInt32(bb.position()) + bb.position(),
      bb
    );
  }
  objectId(obj) {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? (obj || new ObjectId12()).__init(this.bb_pos + offset, this.bb) : null;
  }
  extents(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? (obj || new ChunkIndexRange()).__init(
      this.bb.__vector(this.bb_pos + offset) + index * 8,
      this.bb
    ) : null;
  }
  extentsLength() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
};

// src/format/flatbuffers/generated/array-node-data.ts
var ArrayNodeData = class _ArrayNodeData {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsArrayNodeData(bb, obj) {
    return (obj || new _ArrayNodeData()).__init(
      bb.readInt32(bb.position()) + bb.position(),
      bb
    );
  }
  shape(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? (obj || new DimensionShape()).__init(
      this.bb.__vector(this.bb_pos + offset) + index * 16,
      this.bb
    ) : null;
  }
  shapeLength() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  dimensionNames(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? (obj || new DimensionName()).__init(
      this.bb.__indirect(
        this.bb.__vector(this.bb_pos + offset) + index * 4
      ),
      this.bb
    ) : null;
  }
  dimensionNamesLength() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  manifests(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? (obj || new ManifestRef()).__init(
      this.bb.__indirect(
        this.bb.__vector(this.bb_pos + offset) + index * 4
      ),
      this.bb
    ) : null;
  }
  manifestsLength() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  shapeV2(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? (obj || new DimensionShapeV2()).__init(
      this.bb.__indirect(
        this.bb.__vector(this.bb_pos + offset) + index * 4
      ),
      this.bb
    ) : null;
  }
  shapeV2Length() {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
};

// src/format/flatbuffers/generated/object-id8.ts
var ObjectId8 = class {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  bytes(index) {
    return this.bb.readUint8(this.bb_pos + 0 + index);
  }
  static sizeOf() {
    return 8;
  }
};

// src/format/flatbuffers/generated/node-snapshot.ts
var NodeSnapshot = class _NodeSnapshot {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsNodeSnapshot(bb, obj) {
    return (obj || new _NodeSnapshot()).__init(
      bb.readInt32(bb.position()) + bb.position(),
      bb
    );
  }
  id(obj) {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? (obj || new ObjectId8()).__init(this.bb_pos + offset, this.bb) : null;
  }
  path(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
  }
  userData(index) {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.readUint8(this.bb.__vector(this.bb_pos + offset) + index) : 0;
  }
  userDataLength() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  userDataArray() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? new Uint8Array(
      this.bb.bytes().buffer,
      this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset),
      this.bb.__vector_len(this.bb_pos + offset)
    ) : null;
  }
  nodeDataType() {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.readUint8(this.bb_pos + offset) : 0 /* NONE */;
  }
  nodeData(obj) {
    const offset = this.bb.__offset(this.bb_pos, 12);
    return offset ? this.bb.__union(obj, this.bb_pos + offset) : null;
  }
  extra(index) {
    const offset = this.bb.__offset(this.bb_pos, 14);
    return offset ? this.bb.readUint8(this.bb.__vector(this.bb_pos + offset) + index) : 0;
  }
  extraLength() {
    const offset = this.bb.__offset(this.bb_pos, 14);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  extraArray() {
    const offset = this.bb.__offset(this.bb_pos, 14);
    return offset ? new Uint8Array(
      this.bb.bytes().buffer,
      this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset),
      this.bb.__vector_len(this.bb_pos + offset)
    ) : null;
  }
};

// src/format/flatbuffers/generated/snapshot.ts
var Snapshot = class _Snapshot {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsSnapshot(bb, obj) {
    return (obj || new _Snapshot()).__init(
      bb.readInt32(bb.position()) + bb.position(),
      bb
    );
  }
  id(obj) {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? (obj || new ObjectId12()).__init(this.bb_pos + offset, this.bb) : null;
  }
  parentId(obj) {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? (obj || new ObjectId12()).__init(this.bb_pos + offset, this.bb) : null;
  }
  nodes(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? (obj || new NodeSnapshot()).__init(
      this.bb.__indirect(
        this.bb.__vector(this.bb_pos + offset) + index * 4
      ),
      this.bb
    ) : null;
  }
  nodesLength() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  flushedAt() {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.readUint64(this.bb_pos + offset) : BigInt("0");
  }
  message(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 12);
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
  }
  metadata(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 14);
    return offset ? (obj || new MetadataItem()).__init(
      this.bb.__indirect(
        this.bb.__vector(this.bb_pos + offset) + index * 4
      ),
      this.bb
    ) : null;
  }
  metadataLength() {
    const offset = this.bb.__offset(this.bb_pos, 14);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  manifestFiles(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 16);
    return offset ? (obj || new ManifestFileInfo()).__init(
      this.bb.__vector(this.bb_pos + offset) + index * 32,
      this.bb
    ) : null;
  }
  manifestFilesLength() {
    const offset = this.bb.__offset(this.bb_pos, 16);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  manifestFilesV2(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 18);
    return offset ? (obj || new ManifestFileInfoV2()).__init(
      this.bb.__indirect(
        this.bb.__vector(this.bb_pos + offset) + index * 4
      ),
      this.bb
    ) : null;
  }
  manifestFilesV2Length() {
    const offset = this.bb.__offset(this.bb_pos, 18);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  extra(index) {
    const offset = this.bb.__offset(this.bb_pos, 20);
    return offset ? this.bb.readUint8(this.bb.__vector(this.bb_pos + offset) + index) : 0;
  }
  extraLength() {
    const offset = this.bb.__offset(this.bb_pos, 20);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  extraArray() {
    const offset = this.bb.__offset(this.bb_pos, 20);
    return offset ? new Uint8Array(
      this.bb.bytes().buffer,
      this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset),
      this.bb.__vector_len(this.bb_pos + offset)
    ) : null;
  }
};

// src/format/flatbuffers/snapshot-parser.ts
function readId12(bb, bbPos) {
  return bb.bytes().slice(bbPos, bbPos + 12);
}
function readId8(bb, bbPos) {
  return bb.bytes().slice(bbPos, bbPos + 8);
}
function parseSnapshot(data) {
  const bb = new ByteBuffer2(data);
  const fbsSnapshot = Snapshot.getRootAsSnapshot(bb);
  const idObj = fbsSnapshot.id();
  if (!idObj) throw new Error("Snapshot missing required id field");
  const id = asObjectId12(readId12(idObj.bb, idObj.bb_pos));
  const parentIdObj = fbsSnapshot.parentId();
  const parentId = parentIdObj ? asObjectId12(readId12(parentIdObj.bb, parentIdObj.bb_pos)) : null;
  const nodesLength = fbsSnapshot.nodesLength();
  const nodes = [];
  for (let i = 0; i < nodesLength; i++) {
    const fbsNode = fbsSnapshot.nodes(i);
    if (fbsNode) {
      nodes.push(parseNodeSnapshot(fbsNode));
    }
  }
  const flushedAt = fbsSnapshot.flushedAt();
  const message = fbsSnapshot.message() ?? "";
  const metadataLength = fbsSnapshot.metadataLength();
  const metadata = [];
  for (let i = 0; i < metadataLength; i++) {
    const fbsMeta = fbsSnapshot.metadata(i);
    if (fbsMeta) {
      const name = fbsMeta.name();
      const value = fbsMeta.valueArray();
      if (name && value) {
        metadata.push({ name, value: new Uint8Array(value) });
      }
    }
  }
  const manifestFiles = [];
  const v2Length = fbsSnapshot.manifestFilesV2Length();
  if (v2Length > 0) {
    for (let i = 0; i < v2Length; i++) {
      const fbsMfi = fbsSnapshot.manifestFilesV2(i);
      if (fbsMfi) {
        const mfiIdObj = fbsMfi.id();
        if (!mfiIdObj) throw new Error("ManifestFileInfoV2 missing id");
        manifestFiles.push({
          id: asObjectId12(readId12(mfiIdObj.bb, mfiIdObj.bb_pos)),
          sizeBytes: Number(fbsMfi.sizeBytes()),
          numChunkRefs: fbsMfi.numChunkRefs()
        });
      }
    }
  } else {
    const v1Length = fbsSnapshot.manifestFilesLength();
    for (let i = 0; i < v1Length; i++) {
      const fbsMfi = fbsSnapshot.manifestFiles(i);
      if (fbsMfi) {
        const mfiIdObj = fbsMfi.id();
        if (!mfiIdObj) throw new Error("ManifestFileInfo missing id");
        manifestFiles.push({
          id: asObjectId12(readId12(mfiIdObj.bb, mfiIdObj.bb_pos)),
          sizeBytes: Number(fbsMfi.sizeBytes()),
          numChunkRefs: fbsMfi.numChunkRefs()
        });
      }
    }
  }
  return {
    id,
    parentId,
    nodes,
    flushedAt,
    message,
    metadata,
    manifestFiles
  };
}
function parseNodeSnapshot(fbsNode) {
  const idObj = fbsNode.id();
  if (!idObj) throw new Error("NodeSnapshot missing required id field");
  const id = asObjectId8(readId8(idObj.bb, idObj.bb_pos));
  const path = fbsNode.path() ?? "";
  const userData = fbsNode.userDataArray() ?? new Uint8Array(0);
  const nodeDataType = fbsNode.nodeDataType();
  const nodeData = parseNodeData(fbsNode, nodeDataType);
  return { id, path, userData, nodeData };
}
function parseNodeData(fbsNode, unionType) {
  if (unionType === 0 /* NONE */ || unionType === 2 /* Group */) {
    return { type: "group" };
  }
  if (unionType === 1 /* Array */) {
    const arrayData = fbsNode.nodeData(new ArrayNodeData());
    if (!arrayData) {
      throw new Error("ArrayNodeData union type but no table");
    }
    return parseArrayNodeData(arrayData);
  }
  throw new Error(`Unknown node data union type: ${unionType}`);
}
function parseArrayNodeData(fbsArray) {
  const shape = [];
  const shapeV2Length = fbsArray.shapeV2Length();
  if (shapeV2Length > 0) {
    for (let i = 0; i < shapeV2Length; i++) {
      const fbsShape = fbsArray.shapeV2(i);
      if (fbsShape) {
        const arrayLength = Number(fbsShape.arrayLength());
        const numChunks = fbsShape.numChunks();
        shape.push({
          arrayLength,
          chunkLength: numChunks > 0 ? Math.ceil(arrayLength / numChunks) : 0,
          numChunks
        });
      }
    }
  } else {
    const shapeLength = fbsArray.shapeLength();
    for (let i = 0; i < shapeLength; i++) {
      const fbsShape = fbsArray.shape(i);
      if (fbsShape) {
        shape.push({
          arrayLength: Number(fbsShape.arrayLength()),
          chunkLength: Number(fbsShape.chunkLength())
        });
      }
    }
  }
  const dimNamesLength = fbsArray.dimensionNamesLength();
  const dimensionNames = [];
  for (let i = 0; i < dimNamesLength; i++) {
    const fbsDimName = fbsArray.dimensionNames(i);
    if (fbsDimName) {
      dimensionNames.push(fbsDimName.name());
    } else {
      dimensionNames.push(null);
    }
  }
  const manifestsLength = fbsArray.manifestsLength();
  const manifests = [];
  for (let i = 0; i < manifestsLength; i++) {
    const fbsManifest = fbsArray.manifests(i);
    if (fbsManifest) {
      manifests.push(parseManifestRef(fbsManifest));
    }
  }
  return {
    type: "array",
    shape,
    dimensionNames,
    manifests
  };
}
function parseManifestRef(fbsRef) {
  const objectIdObj = fbsRef.objectId();
  if (!objectIdObj) throw new Error("ManifestRef missing object_id");
  const objectId = asObjectId12(readId12(objectIdObj.bb, objectIdObj.bb_pos));
  const extentsLength = fbsRef.extentsLength();
  const extents = [];
  for (let i = 0; i < extentsLength; i++) {
    const fbsExtent = fbsRef.extents(i);
    if (fbsExtent) {
      extents.push({ from: fbsExtent.from(), to: fbsExtent.to() });
    }
  }
  return { objectId, extents };
}

// src/format/flatbuffers/manifest-parser.ts
import { ByteBuffer as ByteBuffer3 } from "flatbuffers";

// src/format/flatbuffers/generated/chunk-ref.ts
var ChunkRef = class _ChunkRef {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsChunkRef(bb, obj) {
    return (obj || new _ChunkRef()).__init(
      bb.readInt32(bb.position()) + bb.position(),
      bb
    );
  }
  index(index) {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readUint32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
  }
  indexLength() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  indexArray() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? new Uint32Array(
      this.bb.bytes().buffer,
      this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset),
      this.bb.__vector_len(this.bb_pos + offset)
    ) : null;
  }
  inline(index) {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.readUint8(this.bb.__vector(this.bb_pos + offset) + index) : 0;
  }
  inlineLength() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  inlineArray() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? new Uint8Array(
      this.bb.bytes().buffer,
      this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset),
      this.bb.__vector_len(this.bb_pos + offset)
    ) : null;
  }
  offset() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.readUint64(this.bb_pos + offset) : BigInt("0");
  }
  length() {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.readUint64(this.bb_pos + offset) : BigInt("0");
  }
  chunkId(obj) {
    const offset = this.bb.__offset(this.bb_pos, 12);
    return offset ? (obj || new ObjectId12()).__init(this.bb_pos + offset, this.bb) : null;
  }
  location(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 14);
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
  }
  checksumEtag(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 16);
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
  }
  checksumLastModified() {
    const offset = this.bb.__offset(this.bb_pos, 18);
    return offset ? this.bb.readUint32(this.bb_pos + offset) : 0;
  }
  compressedLocation(index) {
    const offset = this.bb.__offset(this.bb_pos, 20);
    return offset ? this.bb.readUint8(this.bb.__vector(this.bb_pos + offset) + index) : 0;
  }
  compressedLocationLength() {
    const offset = this.bb.__offset(this.bb_pos, 20);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  compressedLocationArray() {
    const offset = this.bb.__offset(this.bb_pos, 20);
    return offset ? new Uint8Array(
      this.bb.bytes().buffer,
      this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset),
      this.bb.__vector_len(this.bb_pos + offset)
    ) : null;
  }
  extra(index) {
    const offset = this.bb.__offset(this.bb_pos, 22);
    return offset ? this.bb.readUint8(this.bb.__vector(this.bb_pos + offset) + index) : 0;
  }
  extraLength() {
    const offset = this.bb.__offset(this.bb_pos, 22);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  extraArray() {
    const offset = this.bb.__offset(this.bb_pos, 22);
    return offset ? new Uint8Array(
      this.bb.bytes().buffer,
      this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset),
      this.bb.__vector_len(this.bb_pos + offset)
    ) : null;
  }
};

// src/format/flatbuffers/generated/array-manifest.ts
var ArrayManifest = class _ArrayManifest {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsArrayManifest(bb, obj) {
    return (obj || new _ArrayManifest()).__init(
      bb.readInt32(bb.position()) + bb.position(),
      bb
    );
  }
  nodeId(obj) {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? (obj || new ObjectId8()).__init(this.bb_pos + offset, this.bb) : null;
  }
  refs(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? (obj || new ChunkRef()).__init(
      this.bb.__indirect(
        this.bb.__vector(this.bb_pos + offset) + index * 4
      ),
      this.bb
    ) : null;
  }
  refsLength() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  extra(index) {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.readUint8(this.bb.__vector(this.bb_pos + offset) + index) : 0;
  }
  extraLength() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  extraArray() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? new Uint8Array(
      this.bb.bytes().buffer,
      this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset),
      this.bb.__vector_len(this.bb_pos + offset)
    ) : null;
  }
};

// src/format/flatbuffers/generated/manifest.ts
var Manifest = class _Manifest {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsManifest(bb, obj) {
    return (obj || new _Manifest()).__init(
      bb.readInt32(bb.position()) + bb.position(),
      bb
    );
  }
  id(obj) {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? (obj || new ObjectId12()).__init(this.bb_pos + offset, this.bb) : null;
  }
  arrays(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? (obj || new ArrayManifest()).__init(
      this.bb.__indirect(
        this.bb.__vector(this.bb_pos + offset) + index * 4
      ),
      this.bb
    ) : null;
  }
  arraysLength() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  locationDictionary(index) {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.readUint8(this.bb.__vector(this.bb_pos + offset) + index) : 0;
  }
  locationDictionaryLength() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  locationDictionaryArray() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? new Uint8Array(
      this.bb.bytes().buffer,
      this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset),
      this.bb.__vector_len(this.bb_pos + offset)
    ) : null;
  }
  compressionAlgorithm() {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.readUint8(this.bb_pos + offset) : 1;
  }
  extra(index) {
    const offset = this.bb.__offset(this.bb_pos, 12);
    return offset ? this.bb.readUint8(this.bb.__vector(this.bb_pos + offset) + index) : 0;
  }
  extraLength() {
    const offset = this.bb.__offset(this.bb_pos, 12);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  extraArray() {
    const offset = this.bb.__offset(this.bb_pos, 12);
    return offset ? new Uint8Array(
      this.bb.bytes().buffer,
      this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset),
      this.bb.__vector_len(this.bb_pos + offset)
    ) : null;
  }
};

// src/format/flatbuffers/manifest-parser.ts
function parseManifest(data) {
  const bb = new ByteBuffer3(data);
  const fbsManifest = Manifest.getRootAsManifest(bb);
  const idObj = fbsManifest.id();
  if (!idObj) throw new Error("Manifest missing required id field");
  const id = asObjectId12(
    idObj.bb.bytes().slice(idObj.bb_pos, idObj.bb_pos + 12)
  );
  const arraysLength = fbsManifest.arraysLength();
  const arrays = [];
  for (let i = 0; i < arraysLength; i++) {
    const fbsArray = fbsManifest.arrays(i);
    if (fbsArray) {
      arrays.push(parseArrayManifest(fbsArray));
    }
  }
  const locationDictionaryData = fbsManifest.locationDictionaryArray();
  const locationDictionary = locationDictionaryData && locationDictionaryData.length > 0 ? new Uint8Array(locationDictionaryData) : null;
  return {
    id,
    arrays,
    locationDictionary,
    compressionAlgorithm: fbsManifest.compressionAlgorithm()
  };
}
function parseArrayManifest(fbsArray) {
  const nodeIdObj = fbsArray.nodeId();
  if (!nodeIdObj)
    throw new Error("ArrayManifest missing required node_id field");
  const nodeId = asObjectId8(
    nodeIdObj.bb.bytes().slice(nodeIdObj.bb_pos, nodeIdObj.bb_pos + 8)
  );
  const refsLength = fbsArray.refsLength();
  const refs = [];
  for (let i = 0; i < refsLength; i++) {
    const fbsRef = fbsArray.refs(i);
    if (fbsRef) {
      refs.push(parseChunkRef(fbsRef));
    }
  }
  return { nodeId, refs };
}
function parseChunkRef(fbsRef) {
  const indexLength = fbsRef.indexLength();
  const index = [];
  for (let i = 0; i < indexLength; i++) {
    index.push(fbsRef.index(i));
  }
  const inlineData = fbsRef.inlineArray();
  const inline = inlineData ? new Uint8Array(inlineData) : null;
  const offset = Number(fbsRef.offset());
  const length = Number(fbsRef.length());
  const chunkIdObj = fbsRef.chunkId();
  const chunkId = chunkIdObj ? asObjectId12(
    chunkIdObj.bb.bytes().slice(chunkIdObj.bb_pos, chunkIdObj.bb_pos + 12)
  ) : null;
  const location = fbsRef.location();
  const compressedLocationData = fbsRef.compressedLocationArray();
  const compressedLocation = compressedLocationData && compressedLocationData.length > 0 ? new Uint8Array(compressedLocationData) : null;
  const checksumEtag = fbsRef.checksumEtag();
  const checksumLastModified = fbsRef.checksumLastModified();
  return {
    index,
    inline,
    offset,
    length,
    chunkId,
    location,
    compressedLocation,
    checksumEtag,
    checksumLastModified
  };
}
function findChunkRef(manifest, nodeId, coords) {
  const arrayManifest = binarySearchArrayManifest(manifest.arrays, nodeId);
  if (!arrayManifest) return null;
  return binarySearchChunkRef(arrayManifest.refs, coords);
}
function binarySearchArrayManifest(arrays, nodeId) {
  let low = 0;
  let high = arrays.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const cmp = compareBytes(arrays[mid].nodeId, nodeId);
    if (cmp === 0) {
      return arrays[mid];
    } else if (cmp < 0) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return null;
}
function compareBytes(a, b) {
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}
function compareCoords(a, b) {
  const minLen = Math.min(a.length, b.length);
  for (let i = 0; i < minLen; i++) {
    if (a[i] !== b[i]) return a[i] - b[i];
  }
  return a.length - b.length;
}
function binarySearchChunkRef(refs, coords) {
  let low = 0;
  let high = refs.length - 1;
  while (low <= high) {
    const mid = Math.floor((low + high) / 2);
    const cmp = compareCoords(refs[mid].index, coords);
    if (cmp === 0) {
      return refs[mid];
    } else if (cmp < 0) {
      low = mid + 1;
    } else {
      high = mid - 1;
    }
  }
  return null;
}
function getChunkPayload(ref) {
  if (ref.inline !== null) {
    return { type: "inline", data: ref.inline };
  }
  if (ref.chunkId !== null) {
    return {
      type: "native",
      chunkId: ref.chunkId,
      offset: ref.offset,
      length: ref.length
    };
  }
  if (ref.compressedLocation != null) {
    return {
      type: "virtual",
      location: null,
      compressedLocation: ref.compressedLocation,
      offset: ref.offset,
      length: ref.length,
      checksumEtag: ref.checksumEtag,
      checksumLastModified: ref.checksumLastModified
    };
  }
  if (ref.location !== null) {
    return {
      type: "virtual",
      location: ref.location,
      offset: ref.offset,
      length: ref.length,
      checksumEtag: ref.checksumEtag,
      checksumLastModified: ref.checksumLastModified
    };
  }
  throw new Error("Invalid ChunkRef: no inline, chunkId, or location");
}

// src/format/flatbuffers/metadata.ts
import { decode } from "@msgpack/msgpack";
import * as flexbuffers2 from "flatbuffers/js/flexbuffers.js";
function deserializeMetadata(items, specVersion) {
  const result = /* @__PURE__ */ Object.create(null);
  for (const item of items) {
    result[item.name] = specVersion === 1 /* V1_0 */ ? decode(item.value) : flexbuffers2.toObject(
      item.value.buffer.slice(
        item.value.byteOffset,
        item.value.byteOffset + item.value.byteLength
      )
    );
  }
  return result;
}

// src/format/flatbuffers/transaction-log-parser.ts
import { ByteBuffer as ByteBuffer4 } from "flatbuffers";

// src/format/flatbuffers/generated/chunk-indices.ts
var ChunkIndices = class _ChunkIndices {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsChunkIndices(bb, obj) {
    return (obj || new _ChunkIndices()).__init(
      bb.readInt32(bb.position()) + bb.position(),
      bb
    );
  }
  coords(index) {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.readUint32(this.bb.__vector(this.bb_pos + offset) + index * 4) : 0;
  }
  coordsLength() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  coordsArray() {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? new Uint32Array(
      this.bb.bytes().buffer,
      this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset),
      this.bb.__vector_len(this.bb_pos + offset)
    ) : null;
  }
};

// src/format/flatbuffers/generated/array-updated-chunks.ts
var ArrayUpdatedChunks = class _ArrayUpdatedChunks {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsArrayUpdatedChunks(bb, obj) {
    return (obj || new _ArrayUpdatedChunks()).__init(
      bb.readInt32(bb.position()) + bb.position(),
      bb
    );
  }
  nodeId(obj) {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? (obj || new ObjectId8()).__init(this.bb_pos + offset, this.bb) : null;
  }
  chunks(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? (obj || new ChunkIndices()).__init(
      this.bb.__indirect(
        this.bb.__vector(this.bb_pos + offset) + index * 4
      ),
      this.bb
    ) : null;
  }
  chunksLength() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
};

// src/format/flatbuffers/generated/move-operation.ts
var MoveOperation = class _MoveOperation {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsMoveOperation(bb, obj) {
    return (obj || new _MoveOperation()).__init(
      bb.readInt32(bb.position()) + bb.position(),
      bb
    );
  }
  from(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
  }
  to(optionalEncoding) {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.__string(this.bb_pos + offset, optionalEncoding) : null;
  }
  nodeId(obj) {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? (obj || new ObjectId8()).__init(this.bb_pos + offset, this.bb) : null;
  }
  nodeType() {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.readUint8(this.bb_pos + offset) : 0 /* Group */;
  }
};

// src/format/flatbuffers/generated/transaction-log.ts
var TransactionLog = class _TransactionLog {
  bb = null;
  bb_pos = 0;
  __init(i, bb) {
    this.bb_pos = i;
    this.bb = bb;
    return this;
  }
  static getRootAsTransactionLog(bb, obj) {
    return (obj || new _TransactionLog()).__init(
      bb.readInt32(bb.position()) + bb.position(),
      bb
    );
  }
  id(obj) {
    const offset = this.bb.__offset(this.bb_pos, 4);
    return offset ? (obj || new ObjectId12()).__init(this.bb_pos + offset, this.bb) : null;
  }
  newGroups(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? (obj || new ObjectId8()).__init(
      this.bb.__vector(this.bb_pos + offset) + index * 8,
      this.bb
    ) : null;
  }
  newGroupsLength() {
    const offset = this.bb.__offset(this.bb_pos, 6);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  newArrays(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? (obj || new ObjectId8()).__init(
      this.bb.__vector(this.bb_pos + offset) + index * 8,
      this.bb
    ) : null;
  }
  newArraysLength() {
    const offset = this.bb.__offset(this.bb_pos, 8);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  deletedGroups(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? (obj || new ObjectId8()).__init(
      this.bb.__vector(this.bb_pos + offset) + index * 8,
      this.bb
    ) : null;
  }
  deletedGroupsLength() {
    const offset = this.bb.__offset(this.bb_pos, 10);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  deletedArrays(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 12);
    return offset ? (obj || new ObjectId8()).__init(
      this.bb.__vector(this.bb_pos + offset) + index * 8,
      this.bb
    ) : null;
  }
  deletedArraysLength() {
    const offset = this.bb.__offset(this.bb_pos, 12);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  updatedArrays(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 14);
    return offset ? (obj || new ObjectId8()).__init(
      this.bb.__vector(this.bb_pos + offset) + index * 8,
      this.bb
    ) : null;
  }
  updatedArraysLength() {
    const offset = this.bb.__offset(this.bb_pos, 14);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  updatedGroups(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 16);
    return offset ? (obj || new ObjectId8()).__init(
      this.bb.__vector(this.bb_pos + offset) + index * 8,
      this.bb
    ) : null;
  }
  updatedGroupsLength() {
    const offset = this.bb.__offset(this.bb_pos, 16);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  updatedChunks(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 18);
    return offset ? (obj || new ArrayUpdatedChunks()).__init(
      this.bb.__indirect(
        this.bb.__vector(this.bb_pos + offset) + index * 4
      ),
      this.bb
    ) : null;
  }
  updatedChunksLength() {
    const offset = this.bb.__offset(this.bb_pos, 18);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  movedNodes(index, obj) {
    const offset = this.bb.__offset(this.bb_pos, 20);
    return offset ? (obj || new MoveOperation()).__init(
      this.bb.__indirect(
        this.bb.__vector(this.bb_pos + offset) + index * 4
      ),
      this.bb
    ) : null;
  }
  movedNodesLength() {
    const offset = this.bb.__offset(this.bb_pos, 20);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  extra(index) {
    const offset = this.bb.__offset(this.bb_pos, 22);
    return offset ? this.bb.readUint8(this.bb.__vector(this.bb_pos + offset) + index) : 0;
  }
  extraLength() {
    const offset = this.bb.__offset(this.bb_pos, 22);
    return offset ? this.bb.__vector_len(this.bb_pos + offset) : 0;
  }
  extraArray() {
    const offset = this.bb.__offset(this.bb_pos, 22);
    return offset ? new Uint8Array(
      this.bb.bytes().buffer,
      this.bb.bytes().byteOffset + this.bb.__vector(this.bb_pos + offset),
      this.bb.__vector_len(this.bb_pos + offset)
    ) : null;
  }
};

// src/format/flatbuffers/transaction-log-parser.ts
function readId122(bb, bbPos) {
  return bb.bytes().slice(bbPos, bbPos + 12);
}
function readId82(bb, bbPos) {
  return bb.bytes().slice(bbPos, bbPos + 8);
}
function readId8Vector(length, accessor) {
  const result = [];
  for (let i = 0; i < length; i++) {
    const obj = accessor(i);
    if (obj && obj.bb) {
      result.push(asObjectId8(readId82(obj.bb, obj.bb_pos)));
    }
  }
  return result;
}
function parseTransactionLog(data) {
  const bb = new ByteBuffer4(data);
  const fbs = TransactionLog.getRootAsTransactionLog(bb);
  const idObj = fbs.id();
  if (!idObj) throw new Error("TransactionLog missing required id field");
  const id = asObjectId12(readId122(idObj.bb, idObj.bb_pos));
  const newGroups = readId8Vector(
    fbs.newGroupsLength(),
    (i) => fbs.newGroups(i)
  );
  const newArrays = readId8Vector(
    fbs.newArraysLength(),
    (i) => fbs.newArrays(i)
  );
  const deletedGroups = readId8Vector(
    fbs.deletedGroupsLength(),
    (i) => fbs.deletedGroups(i)
  );
  const deletedArrays = readId8Vector(
    fbs.deletedArraysLength(),
    (i) => fbs.deletedArrays(i)
  );
  const updatedArrays = readId8Vector(
    fbs.updatedArraysLength(),
    (i) => fbs.updatedArrays(i)
  );
  const updatedGroups = readId8Vector(
    fbs.updatedGroupsLength(),
    (i) => fbs.updatedGroups(i)
  );
  const updatedChunks = [];
  for (let i = 0; i < fbs.updatedChunksLength(); i++) {
    const fbsChunk = fbs.updatedChunks(i);
    if (!fbsChunk) continue;
    const nodeIdObj = fbsChunk.nodeId();
    if (!nodeIdObj || !nodeIdObj.bb) continue;
    const nodeId = asObjectId8(readId82(nodeIdObj.bb, nodeIdObj.bb_pos));
    const chunks = [];
    for (let j = 0; j < fbsChunk.chunksLength(); j++) {
      const fbsIndices = fbsChunk.chunks(j);
      if (!fbsIndices) continue;
      const coords = [];
      for (let k = 0; k < fbsIndices.coordsLength(); k++) {
        const coord = fbsIndices.coords(k);
        if (coord !== null) coords.push(coord);
      }
      chunks.push({ coords });
    }
    updatedChunks.push({ nodeId, chunks });
  }
  const movedNodes = [];
  for (let i = 0; i < fbs.movedNodesLength(); i++) {
    const fbsMove = fbs.movedNodes(i);
    if (!fbsMove) continue;
    const from = fbsMove.from();
    const to = fbsMove.to();
    if (from !== null && to !== null) {
      movedNodes.push({ from, to });
    }
  }
  return {
    id,
    newGroups,
    newArrays,
    deletedGroups,
    deletedArrays,
    updatedArrays,
    updatedGroups,
    updatedChunks,
    movedNodes
  };
}

// src/reader/range-coalescer.ts
function expectedRangeLength(range) {
  return "suffixLength" in range ? range.suffixLength : range.length;
}
function makeUrlStore(opts) {
  const { url, fetchClient, conditionalHeaders } = opts;
  async function doFetch(init) {
    return fetchClient ? await fetchClient.fetch(url, init) : await fetch(url, init);
  }
  return {
    async get() {
      throw new Error(
        `Virtual chunk URL store for ${url} only supports ranged reads`
      );
    },
    async getRange(_key, range, options) {
      const headers = conditionalHeaders ? { ...conditionalHeaders } : {};
      headers.Range = "suffixLength" in range ? `bytes=-${range.suffixLength}` : `bytes=${range.offset}-${range.offset + range.length - 1}`;
      const response = await doFetch({ headers, signal: options?.signal });
      if (response.status === 412) {
        throw new Error(
          `Virtual chunk at ${url} failed integrity check \u2014 data has been modified since snapshot was created`
        );
      }
      if (response.status !== 200 && response.status !== 206) {
        throw new Error(
          `Failed to fetch virtual chunk from ${url}: ${response.status} ${response.statusText}`
        );
      }
      const data = new Uint8Array(await response.arrayBuffer());
      if (response.status === 206) {
        const expected = expectedRangeLength(range);
        if (data.length === expected) return data;
        throw new Error(
          `Virtual range response size mismatch for ${url}: expected ${expected} bytes, got ${data.length}`
        );
      }
      if ("offset" in range) {
        const end = range.offset + range.length;
        if (data.length >= end) return data.slice(range.offset, end);
        throw new Error(
          `Virtual range request not honored for ${url}: need at least ${end} bytes for fallback slicing, got ${data.length}`
        );
      }
      if (data.length >= range.suffixLength) {
        return data.slice(data.length - range.suffixLength);
      }
      throw new Error(
        `Virtual suffix range request not honored for ${url}: need at least ${range.suffixLength} bytes for fallback slicing, got ${data.length}`
      );
    }
  };
}
function makeStorageStore(storage) {
  return {
    async get(key, options) {
      const storageOptions = options?.signal ? { signal: options.signal } : void 0;
      return storage.getObject(key, void 0, storageOptions);
    },
    async getRange(key, range, options) {
      const storageOptions = options?.signal ? { signal: options.signal } : void 0;
      if ("suffixLength" in range) {
        throw new Error(
          `Storage suffix ranges are not supported for ${key}; convert suffixLength to offset/length before reading`
        );
      }
      const storageRange = {
        start: range.offset,
        end: range.offset + range.length
      };
      const data = await storage.getObject(key, storageRange, storageOptions);
      if (data.length === range.length) return data;
      if (data.length >= storageRange.end) {
        return data.slice(storageRange.start, storageRange.end);
      }
      throw new Error(
        `Storage returned ${data.length} bytes for ${key} range ${storageRange.start}-${storageRange.end - 1}; expected ${range.length} bytes`
      );
    }
  };
}

// src/reader/session.ts
var RANGE_COALESCE_SIZE = 32 * 1024;
var RANGE_STORE_CACHE_SIZE = 256;
function makeRangeStoreCacheKey(parts) {
  return JSON.stringify(parts);
}
var textDecoder = new TextDecoder();
var zstdCodecPromise;
async function getZstdCodec() {
  if (!zstdCodecPromise) {
    zstdCodecPromise = import("zstd-codec").then(
      ({ ZstdCodec }) => new Promise((resolve) => {
        ZstdCodec.run((zstd) => resolve(zstd));
      })
    );
  }
  return zstdCodecPromise;
}
async function decompressVirtualLocation(compressedLocation, locationDictionary) {
  const zstd = await getZstdCodec();
  const dict = new zstd.Dict.Decompression(locationDictionary);
  try {
    const decompressed = new zstd.Simple().decompressUsingDict(
      compressedLocation,
      dict
    );
    if (!decompressed) {
      throw new Error("Failed to decompress virtual chunk location");
    }
    return textDecoder.decode(decompressed);
  } finally {
    dict.close();
  }
}
var ReadSession = class _ReadSession {
  storage;
  snapshot;
  specVersion;
  manifestCache;
  /**
   * Single-flight loader over `manifestCache`: concurrent misses for the
   * same manifest share one fetch instead of racing N identical GETs.
   * Critical for fan-out reads that all need the same manifest (e.g. the
   * many parallel chunk reads issued when a renderer crosses into a new
   * pyramid level).
   */
  manifestLoader;
  /**
   * Bounded cache of `AsyncReadable`s wrapped with zarrita's range coalescer.
   * The cache key includes request-option identities that must not share one
   * coalescing queue, notably virtual fetch clients and checksum headers.
   *
   * Promise slots are inserted synchronously on first use, so
   * concurrent requests for the same partition share one coalescing window
   * instead of racing to create parallel stores.
   */
  rangeStores;
  nativeStore;
  fetchClientIds;
  nextFetchClientId = 1;
  rangeCoalescerIds;
  nextRangeCoalescerId = 1;
  /** VCC name → url_prefix map for resolving `vcc://` chunk locations. */
  virtualChunkContainers;
  constructor(storage, snapshot, specVersion, maxManifestCacheSize = 100, virtualChunkContainers) {
    this.storage = storage;
    this.snapshot = snapshot;
    this.specVersion = specVersion;
    this.manifestCache = new LRUCache(maxManifestCacheSize);
    this.manifestLoader = singleFlight(this.manifestCache);
    this.virtualChunkContainers = virtualChunkContainers ?? /* @__PURE__ */ new Map();
  }
  getFetchClientKey(fetchClient) {
    if (!fetchClient) return "default";
    if (!this.fetchClientIds) this.fetchClientIds = /* @__PURE__ */ new WeakMap();
    let id = this.fetchClientIds.get(fetchClient);
    if (id === void 0) {
      id = this.nextFetchClientId;
      this.nextFetchClientId = id + 1;
      this.fetchClientIds.set(fetchClient, id);
    }
    return String(id);
  }
  getRangeCoalescerKey(withRangeCoalescing) {
    if (!this.rangeCoalescerIds) this.rangeCoalescerIds = /* @__PURE__ */ new WeakMap();
    let id = this.rangeCoalescerIds.get(withRangeCoalescing);
    if (id === void 0) {
      id = this.nextRangeCoalescerId;
      this.nextRangeCoalescerId = id + 1;
      this.rangeCoalescerIds.set(withRangeCoalescing, id);
    }
    return String(id);
  }
  getRangeStore(partitionKey, createStore, withRangeCoalescing) {
    if (!this.rangeStores) {
      this.rangeStores = new LRUCache(RANGE_STORE_CACHE_SIZE);
    }
    const stores = this.rangeStores;
    const cacheKey = makeRangeStoreCacheKey([
      ...partitionKey,
      ["coalescer", this.getRangeCoalescerKey(withRangeCoalescing)]
    ]);
    const cached = stores.get(cacheKey);
    if (cached) return cached;
    const raw = createStore();
    const promise = Promise.resolve().then(
      () => withRangeCoalescing(raw, { coalesceSize: RANGE_COALESCE_SIZE })
    ).catch((error) => {
      if (stores.get(cacheKey) === promise) stores.delete(cacheKey);
      throw error;
    });
    stores.set(cacheKey, promise);
    return promise;
  }
  getNativeStore(options) {
    if (!this.nativeStore) {
      this.nativeStore = makeStorageStore(this.storage);
    }
    const raw = this.nativeStore;
    const withRangeCoalescing = options?.withRangeCoalescing;
    if (!withRangeCoalescing) {
      return Promise.resolve(raw);
    }
    return this.getRangeStore(["native"], () => raw, withRangeCoalescing);
  }
  getVirtualStoreForPayload(httpUrl, payload, options) {
    const validate = !!options?.validateChecksums;
    let conditionalHeaders;
    if (validate) {
      conditionalHeaders = {};
      if (payload.checksumEtag) {
        conditionalHeaders["If-Match"] = payload.checksumEtag;
      }
      if (payload.checksumLastModified > 0) {
        conditionalHeaders["If-Unmodified-Since"] = new Date(
          payload.checksumLastModified * 1e3
        ).toUTCString();
      }
    }
    const checksumKey = validate ? ["checked", payload.checksumEtag ?? "", payload.checksumLastModified] : ["unchecked"];
    const createStore = () => makeUrlStore({
      url: httpUrl,
      fetchClient: options?.fetchClient,
      conditionalHeaders
    });
    const withRangeCoalescing = options?.withRangeCoalescing;
    if (!withRangeCoalescing) {
      return Promise.resolve(createStore());
    }
    return this.getRangeStore(
      [
        "virtual",
        httpUrl,
        ["fetch", this.getFetchClientKey(options?.fetchClient)],
        checksumKey
      ],
      createStore,
      withRangeCoalescing
    );
  }
  /**
   * Open a read session for a specific snapshot.
   *
   * @param storage - Storage backend
   * @param snapshotId - Snapshot ID (12 bytes)
   * @param options - Optional request options (signal for cancellation)
   * @returns ReadSession instance
   */
  static async open(storage, snapshotId, options) {
    const { snapshot, specVersion } = await _ReadSession.loadSnapshot(
      storage,
      snapshotId,
      options
    );
    return new _ReadSession(
      storage,
      snapshot,
      specVersion,
      options?.maxManifestCacheSize,
      options?.virtualChunkContainers
    );
  }
  /** Load and parse a snapshot from storage */
  static async loadSnapshot(storage, snapshotId, options) {
    const path = getSnapshotPath(encodeObjectId12(snapshotId));
    const data = await storage.getObject(path, void 0, options);
    const header = parseHeader(data);
    validateFileType(header, 1 /* Snapshot */);
    let flatbufferData = getDataAfterHeader(data);
    if (header.compression === 1 /* Zstd */) {
      flatbufferData = decompress2(flatbufferData);
    }
    return {
      snapshot: parseSnapshot(flatbufferData),
      specVersion: header.specVersion
    };
  }
  /**
   * Load and parse a manifest from storage.
   *
   * Concurrent calls for the same manifest are coalesced through
   * `manifestLoader` so a fan-out of chunk reads — the typical case
   * when many tiles cross into a new pyramid level at once — issues one
   * HTTP GET instead of one per caller. A caller's `signal` rejects only
   * that caller's await; the shared fetch is aborted only once every
   * active waiter has aborted.
   */
  loadManifest(manifestId, options) {
    const idStr = encodeObjectId12(manifestId);
    return this.manifestLoader.load(
      idStr,
      (signal) => this.fetchManifest(idStr, signal),
      options?.signal
    );
  }
  /**
   * Fetch and parse a single manifest. The `signal` here is the
   * single-flight loader's own signal — it fires only when every waiter
   * has aborted, so a hung manifest fetch doesn't trap later callers
   * behind it.
   */
  async fetchManifest(idStr, signal) {
    const path = getManifestPath(idStr);
    const data = await this.storage.getObject(path, void 0, { signal });
    const header = parseHeader(data);
    validateFileType(header, 2 /* Manifest */);
    let flatbufferData = getDataAfterHeader(data);
    if (header.compression === 1 /* Zstd */) {
      flatbufferData = decompress2(flatbufferData);
    }
    return parseManifest(flatbufferData);
  }
  /**
   * Get the snapshot ID.
   */
  getSnapshotId() {
    return this.snapshot.id;
  }
  /**
   * Get the spec version of the snapshot.
   */
  getSpecVersion() {
    return this.specVersion;
  }
  /**
   * Get the parent snapshot ID, or null for root snapshots.
   */
  getParentSnapshotId() {
    return this.snapshot.parentId;
  }
  /**
   * Get the commit message for this snapshot.
   */
  getMessage() {
    return this.snapshot.message;
  }
  /**
   * Get the timestamp when this snapshot was created.
   */
  getFlushedAt() {
    return new Date(Number(this.snapshot.flushedAt / 1000n));
  }
  /**
   * Get deserialized snapshot metadata.
   *
   * Decodes MessagePack (v1) or FlexBuffers (v2) metadata items
   * into a plain key-value object.
   */
  getSnapshotMetadata() {
    return deserializeMetadata(this.snapshot.metadata, this.specVersion);
  }
  /**
   * Load and parse the transaction log for this snapshot.
   *
   * Returns null if no transaction log exists (e.g., root snapshot).
   *
   * @param options - Optional request options (signal for cancellation)
   * @returns Parsed transaction log entry or null
   */
  async loadTransactionLog(options) {
    const path = getTransactionLogPath(encodeObjectId12(this.snapshot.id));
    let data;
    try {
      data = await this.storage.getObject(path, void 0, options);
    } catch (error) {
      if (error instanceof NotFoundError) return null;
      throw error;
    }
    const header = parseHeader(data);
    validateFileType(header, 4 /* TransactionLog */);
    let flatbufferData = getDataAfterHeader(data);
    if (header.compression === 1 /* Zstd */) {
      flatbufferData = decompress2(flatbufferData);
    }
    return parseTransactionLog(flatbufferData);
  }
  /**
   * Get a node by path.
   *
   * @param path - Absolute path (e.g., "/array" or "/group/nested")
   * @returns NodeSnapshot or null if not found
   */
  getNode(path) {
    const normalizedPath = path.startsWith("/") ? path : `/${path}`;
    return this.binarySearchNode(normalizedPath);
  }
  /**
   * List all nodes in the snapshot.
   *
   * @returns Array of all nodes
   */
  listNodes() {
    return [...this.snapshot.nodes];
  }
  /**
   * List children of a group.
   *
   * @param parentPath - Path to the parent group (use "/" for root)
   * @returns Array of child nodes
   */
  listChildren(parentPath) {
    const normalizedParent = parentPath === "/" ? "" : parentPath;
    const prefix = normalizedParent + "/";
    return this.snapshot.nodes.filter((node) => {
      if (!node.path.startsWith(prefix)) return false;
      const rest = node.path.slice(prefix.length);
      return !rest.includes("/");
    });
  }
  /**
   * Get the Zarr metadata for a node.
   *
   * @param path - Path to the node
   * @returns Parsed JSON metadata or null if node not found
   */
  getMetadata(path) {
    const node = this.getNode(path);
    if (!node) return null;
    const json = new TextDecoder().decode(node.userData);
    return JSON.parse(json);
  }
  /**
   * Get raw user data (Zarr metadata bytes) for a node.
   *
   * @param path - Path to the node
   * @returns Raw metadata bytes or null if node not found
   */
  getRawMetadata(path) {
    const node = this.getNode(path);
    if (!node) return null;
    return node.userData;
  }
  /**
   * Read chunk data for an array.
   *
   * @param path - Path to the array
   * @param coords - Chunk coordinates (N-dimensional)
   * @param options - Optional request options (signal for cancellation)
   * @returns Chunk data bytes or null if not found
   */
  async getChunk(path, coords, options) {
    options?.signal?.throwIfAborted();
    const requestOptions = toRequestOptions(options);
    const node = this.getNode(path);
    if (!node || node.nodeData.type !== "array") {
      return null;
    }
    const arrayData = node.nodeData;
    for (const manifestRef of arrayData.manifests) {
      if (!this.coordsInExtents(coords, manifestRef.extents)) {
        continue;
      }
      const manifest = await this.loadManifest(
        manifestRef.objectId,
        requestOptions
      );
      const chunkRef = findChunkRef(manifest, node.id, coords);
      if (!chunkRef) continue;
      const payload = getChunkPayload(chunkRef);
      return this.fetchChunkPayload(payload, options, manifest);
    }
    return null;
  }
  /**
   * Read a byte range of chunk data for an array.
   *
   * Like getChunk, but fetches only the requested byte range from storage
   * instead of the full chunk. Used by IcechunkStore.getRange to support
   * zarrita's sharded array reads efficiently.
   *
   * @param path - Path to the array
   * @param coords - Chunk coordinates (N-dimensional)
   * @param range - Byte range within the chunk data
   * @param options - Optional request options (signal for cancellation)
   * @returns Chunk data bytes or null if not found
   */
  async getChunkRange(path, coords, range, options) {
    options?.signal?.throwIfAborted();
    const requestOptions = toRequestOptions(options);
    const node = this.getNode(path);
    if (!node || node.nodeData.type !== "array") {
      return null;
    }
    const arrayData = node.nodeData;
    for (const manifestRef of arrayData.manifests) {
      if (!this.coordsInExtents(coords, manifestRef.extents)) {
        continue;
      }
      const manifest = await this.loadManifest(
        manifestRef.objectId,
        requestOptions
      );
      const chunkRef = findChunkRef(manifest, node.id, coords);
      if (!chunkRef) continue;
      const payload = getChunkPayload(chunkRef);
      return this.fetchChunkPayloadRange(payload, range, options, manifest);
    }
    return null;
  }
  /** Check if coordinates fall within extent ranges */
  coordsInExtents(coords, extents) {
    if (coords.length !== extents.length) return false;
    for (let i = 0; i < coords.length; i++) {
      const { from, to } = extents[i];
      if (coords[i] < from || coords[i] >= to) {
        return false;
      }
    }
    return true;
  }
  /** Fetch chunk data based on payload type */
  async fetchChunkPayload(payload, options, manifest) {
    switch (payload.type) {
      case "inline":
        return payload.data;
      case "native": {
        const path = getChunkPath(encodeObjectId12(payload.chunkId));
        const requestedStart = payload.offset;
        const requestedEnd = payload.offset + payload.length;
        const store = await this.getNativeStore(options);
        const data = await store.getRange(
          path,
          { offset: requestedStart, length: payload.length },
          { signal: options?.signal }
        );
        if (!data) {
          throw new Error(
            `Failed to fetch native chunk from ${path} range ${requestedStart}-${requestedEnd - 1}: empty response`
          );
        }
        if (data.length === payload.length) return data;
        throw new Error(
          `Storage returned ${data.length} bytes for ${path} range ${requestedStart}-${requestedEnd - 1}; expected ${payload.length} bytes`
        );
      }
      case "virtual": {
        const resolvedLocation = await this.resolveVirtualLocation(
          payload,
          manifest
        );
        const absoluteLocation = expandVccUrl(
          resolvedLocation,
          this.virtualChunkContainers
        );
        const httpUrl = translateToHttpUrl(
          absoluteLocation,
          options?.azureAccount
        );
        const store = await this.getVirtualStoreForPayload(
          httpUrl,
          payload,
          options
        );
        const data = await store.getRange(
          "/",
          { offset: payload.offset, length: payload.length },
          { signal: options?.signal }
        );
        if (!data) {
          throw new Error(
            `Failed to fetch virtual chunk from ${httpUrl}: empty response`
          );
        }
        if (data.length !== payload.length) {
          throw new Error(
            `Virtual range response size mismatch for ${httpUrl}: expected ${payload.length} bytes, got ${data.length}`
          );
        }
        return data;
      }
    }
  }
  /** Fetch a byte range of chunk data based on payload type */
  async fetchChunkPayloadRange(payload, range, options, manifest) {
    let rangeStart;
    let rangeEnd;
    if ("suffixLength" in range) {
      rangeStart = payload.type === "inline" ? payload.data.length - range.suffixLength : payload.length - range.suffixLength;
      rangeEnd = payload.type === "inline" ? payload.data.length : payload.length;
    } else {
      rangeStart = range.offset;
      rangeEnd = range.offset + range.length;
    }
    switch (payload.type) {
      case "inline":
        return payload.data.slice(rangeStart, rangeEnd);
      case "native": {
        const path = getChunkPath(encodeObjectId12(payload.chunkId));
        const requestedStart = payload.offset + rangeStart;
        const expectedSize = rangeEnd - rangeStart;
        const requestedEnd = requestedStart + expectedSize;
        const store = await this.getNativeStore(options);
        const data = await store.getRange(
          path,
          { offset: requestedStart, length: expectedSize },
          { signal: options?.signal }
        );
        if (!data) {
          throw new Error(
            `Failed to fetch native chunk from ${path} range ${requestedStart}-${requestedEnd - 1}: empty response`
          );
        }
        if (data.length === expectedSize) return data;
        throw new Error(
          `Storage returned ${data.length} bytes for ${path} range ${requestedStart}-${requestedEnd - 1}; expected ${expectedSize} bytes`
        );
      }
      case "virtual": {
        const absoluteStart = payload.offset + rangeStart;
        const expectedSize = rangeEnd - rangeStart;
        const resolvedLocation = await this.resolveVirtualLocation(
          payload,
          manifest
        );
        const absoluteLocation = expandVccUrl(
          resolvedLocation,
          this.virtualChunkContainers
        );
        const httpUrl = translateToHttpUrl(
          absoluteLocation,
          options?.azureAccount
        );
        const store = await this.getVirtualStoreForPayload(
          httpUrl,
          payload,
          options
        );
        const data = await store.getRange(
          "/",
          { offset: absoluteStart, length: expectedSize },
          { signal: options?.signal }
        );
        if (!data) {
          throw new Error(
            `Failed to fetch virtual chunk from ${httpUrl}: empty response`
          );
        }
        if (data.length !== expectedSize) {
          throw new Error(
            `Virtual range response size mismatch for ${httpUrl}: expected ${expectedSize} bytes, got ${data.length}`
          );
        }
        return data;
      }
    }
  }
  async resolveVirtualLocation(payload, manifest) {
    if (payload.location !== null) {
      return payload.location;
    }
    if (payload.compressedLocation === void 0 || payload.compressedLocation === null) {
      throw new Error("Virtual chunk payload is missing a location");
    }
    const compressionAlgorithm = manifest?.compressionAlgorithm ?? 1;
    if (compressionAlgorithm === 0) {
      return textDecoder.decode(payload.compressedLocation);
    }
    const locationDictionary = manifest?.locationDictionary;
    if (!locationDictionary || locationDictionary.length === 0) {
      throw new Error(
        "Missing location dictionary for compressed virtual chunk location"
      );
    }
    return decompressVirtualLocation(
      payload.compressedLocation,
      locationDictionary
    );
  }
  /** Binary search for a node by path */
  binarySearchNode(path) {
    const nodes = this.snapshot.nodes;
    let low = 0;
    let high = nodes.length - 1;
    while (low <= high) {
      const mid = Math.floor((low + high) / 2);
      const cmp = compareUtf8Bytes(nodes[mid].path, path);
      if (cmp === 0) {
        return nodes[mid];
      } else if (cmp < 0) {
        low = mid + 1;
      } else {
        high = mid - 1;
      }
    }
    return null;
  }
};
var utf8Encoder = new TextEncoder();
function toRequestOptions(options) {
  if (!options) return void 0;
  return {
    ...options.signal && { signal: options.signal },
    ...options.fetchClient && { fetchClient: options.fetchClient },
    ...options.validateChecksums !== void 0 && {
      validateChecksums: options.validateChecksums
    },
    ...options.azureAccount !== void 0 && {
      azureAccount: options.azureAccount
    }
  };
}
function compareUtf8Bytes(a, b) {
  const bytesA = utf8Encoder.encode(a);
  const bytesB = utf8Encoder.encode(b);
  const minLen = Math.min(bytesA.length, bytesB.length);
  for (let i = 0; i < minLen; i++) {
    if (bytesA[i] !== bytesB[i]) {
      return bytesA[i] - bytesB[i];
    }
  }
  return bytesA.length - bytesB.length;
}
var VCC_SCHEME = "vcc://";
function expandVccUrl(location, containers) {
  if (!location.startsWith(VCC_SCHEME)) return location;
  const rest = location.slice(VCC_SCHEME.length);
  const slash = rest.indexOf("/");
  if (slash === -1) {
    throw new Error(
      `Invalid vcc:// URL "${location}": missing "/" after container name`
    );
  }
  const name = rest.slice(0, slash);
  const relativePath = rest.slice(slash + 1);
  const urlPrefix = containers.get(name);
  if (urlPrefix === void 0) {
    if (containers.size === 0) return location;
    throw new Error(
      `Unknown virtual chunk container "${name}" referenced by ${location}`
    );
  }
  const normalizedPrefix = urlPrefix.endsWith("/") ? urlPrefix : `${urlPrefix}/`;
  return normalizedPrefix + relativePath;
}
function translateToHttpUrl(url, azureAccount) {
  if (url.startsWith("s3://")) {
    const rest = url.slice(5);
    const slashIndex = rest.indexOf("/");
    if (slashIndex === -1) {
      const bucket2 = rest;
      if (bucket2.includes(".")) {
        return `https://s3.amazonaws.com/${bucket2}/`;
      }
      return `https://${bucket2}.s3.amazonaws.com/`;
    }
    const bucket = rest.slice(0, slashIndex);
    const key = rest.slice(slashIndex + 1);
    if (bucket.includes(".")) {
      return `https://s3.amazonaws.com/${bucket}/${key}`;
    }
    return `https://${bucket}.s3.amazonaws.com/${key}`;
  }
  if (url.startsWith("gs://") || url.startsWith("gcs://")) {
    const prefixLen = url.startsWith("gs://") ? 5 : 6;
    const rest = url.slice(prefixLen);
    return `https://storage.googleapis.com/${rest}`;
  }
  if (url.startsWith("az://") || url.startsWith("azure://")) {
    if (!azureAccount) {
      throw new Error(
        `Cannot translate Azure URL "${url}": azureAccount option is required. az:// and azure:// URLs encode only the container name; pass azureAccount in store options to supply the storage account.`
      );
    }
    const prefixLen = url.startsWith("az://") ? 5 : 8;
    const rest = url.slice(prefixLen);
    const firstSlash = rest.indexOf("/");
    if (firstSlash === -1) {
      return `https://${azureAccount}.blob.core.windows.net/${rest}`;
    }
    const container = rest.slice(0, firstSlash);
    const path = rest.slice(firstSlash + 1);
    return `https://${azureAccount}.blob.core.windows.net/${container}/${path}`;
  }
  if (url.startsWith("abfs://")) {
    const rest = url.slice(7);
    const atIndex = rest.indexOf("@");
    if (atIndex !== -1) {
      const container = rest.slice(0, atIndex);
      const hostAndPath = rest.slice(atIndex + 1);
      const firstSlash = hostAndPath.indexOf("/");
      const host = firstSlash === -1 ? hostAndPath : hostAndPath.slice(0, firstSlash);
      const path = firstSlash === -1 ? "" : hostAndPath.slice(firstSlash + 1);
      const dotIndex = host.indexOf(".");
      const account = dotIndex === -1 ? host : host.slice(0, dotIndex);
      const suffix = path ? `${container}/${path}` : container;
      return `https://${account}.blob.core.windows.net/${suffix}`;
    }
  }
  return url;
}

// src/reader/repository.ts
var Repository = class _Repository {
  storage;
  repoInfo = null;
  repoInfoAttempted = false;
  constructor(storage) {
    this.storage = storage;
  }
  /**
   * Load and cache the v2 repo info file.
   *
   * Uses getObject() directly to avoid race conditions with exists().
   * - NotFoundError => v1 format (no repo file)
   * - Any other error => hard error (parse failure, etc.)
   *
   * @param options - Optional request options (signal for cancellation)
   * @returns ParsedRepo if v2 format, null if v1 format
   * @throws Error if repo file exists but fails to parse
   * @throws An error named "AbortError" if the operation was aborted
   */
  async loadRepoInfo(options) {
    if (this.repoInfoAttempted) {
      return this.repoInfo;
    }
    this.repoInfoAttempted = true;
    try {
      const data = await this.storage.getObject(
        REPO_INFO_PATH,
        void 0,
        options
      );
      this.repoInfo = parseRepo(data);
      return this.repoInfo;
    } catch (error) {
      if (isAbortError(error)) {
        this.repoInfoAttempted = false;
        throw error;
      }
      if (error instanceof NotFoundError) {
        return null;
      }
      throw new Error(
        `Failed to parse v2 repo file: ${error instanceof Error ? error.message : error}`
      );
    }
  }
  /**
   * Open an icechunk repository.
   *
   * - Try to load and parse repo info file (v2+ format)
   * - If NotFoundError, check for main branch (v1 format)
   * - Parse failures are hard errors (matching Rust behavior)
   *
   * @param options - Repository options including storage backend
   * @param requestOptions - Optional request options (signal for cancellation)
   * @returns A Repository instance
   */
  static async open(options, requestOptions) {
    const repo = new _Repository(options.storage);
    if (options.formatVersion === "v1") {
      repo.repoInfoAttempted = true;
      return repo;
    }
    const repoInfo = await repo.loadRepoInfo(requestOptions);
    if (repoInfo) {
      return repo;
    }
    if (options.formatVersion === "v2") {
      throw new Error("Repository info not found but v2 format was specified");
    }
    const mainBranchDir = getBranchRefDirPath("main");
    const mainExists = await repo.hasAnyRefFile(
      mainBranchDir,
      getBranchRefPath("main"),
      requestOptions
    );
    if (mainExists) {
      return repo;
    }
    throw new Error(
      "Not a valid icechunk repository: neither repo info file nor main branch found"
    );
  }
  /**
   * Check if any ref file exists in a directory.
   * Ref files are .json files that are not .deleted files.
   *
   * @param dirPrefix - Directory prefix to check
   * @param legacyPath - Optional legacy ref.json path to check if listing fails
   * @param options - Optional request options (signal for cancellation)
   */
  async hasAnyRefFile(dirPrefix, legacyPath, options) {
    try {
      for await (const path of this.storage.listPrefix(dirPrefix)) {
        if (path.endsWith(".json") && !path.endsWith(".deleted")) {
          return true;
        }
      }
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      if (legacyPath) {
        return await this.storage.exists(legacyPath, options);
      }
    }
    return false;
  }
  /**
   * Find the latest non-deleted ref file in a directory.
   * When storage supports listPrefix(), refs may use versioned filenames
   * (e.g., AAAAAAAA.json) for optimistic concurrency control. The latest
   * version has the highest filename. Deletion tombstones are checked.
   *
   * When listing is not supported (e.g., HTTP storage), only the legacy
   * ref.json path is returned (caller must handle NotFoundError on read).
   *
   * @param dirPrefix - Directory prefix to search
   * @param legacyPath - Optional legacy ref.json path to try if listing fails
   */
  async findLatestRefFile(dirPrefix, legacyPath) {
    const jsonFiles = [];
    const deletedFiles = /* @__PURE__ */ new Set();
    try {
      for await (const path of this.storage.listPrefix(dirPrefix)) {
        if (path.endsWith(".deleted")) {
          deletedFiles.add(path.slice(0, -".deleted".length));
        } else if (path.endsWith(".json")) {
          jsonFiles.push(path);
        }
      }
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      return legacyPath || null;
    }
    if (jsonFiles.length === 0) {
      return null;
    }
    jsonFiles.sort();
    for (let i = jsonFiles.length - 1; i >= 0; i--) {
      if (!deletedFiles.has(jsonFiles[i])) {
        return jsonFiles[i];
      }
    }
    return null;
  }
  /**
   * List all branches in the repository.
   *
   * Unlike tags, branches in icechunk v1 have no tombstone mechanism —
   * deletion removes the ref file outright. A branch is present iff it has
   * at least one ref file in its directory.
   *
   * @returns Array of branch names
   */
  async listBranches() {
    const repoInfo = await this.loadRepoInfo();
    if (repoInfo) {
      return listBranchesFromRepo(repoInfo);
    }
    const branches = /* @__PURE__ */ new Set();
    try {
      for await (const path of this.storage.listPrefix(
        `${PATHS.REFS}/branch.`
      )) {
        const match = path.match(/^refs\/branch\.(.+)\/([^/]+\.json)$/);
        if (match) {
          branches.add(match[1]);
        }
      }
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      throw new Error("Cannot list branches: storage does not support listing");
    }
    return [...branches];
  }
  /**
   * List all tags in the repository.
   *
   * Tags with deletion tombstones on their latest ref file are excluded.
   *
   * @returns Array of tag names
   */
  async listTags() {
    const repoInfo = await this.loadRepoInfo();
    if (repoInfo) {
      return listTagsFromRepo(repoInfo);
    }
    const tagFiles = /* @__PURE__ */ new Map();
    try {
      for await (const path of this.storage.listPrefix(`${PATHS.REFS}/tag.`)) {
        const jsonMatch = path.match(/^refs\/tag\.(.+)\/([^/]+\.json)$/);
        const deletedMatch = path.match(
          /^refs\/tag\.(.+)\/([^/]+\.json)\.deleted$/
        );
        if (deletedMatch) {
          const tagName = deletedMatch[1];
          const refFile = `refs/tag.${tagName}/${deletedMatch[2]}`;
          if (!tagFiles.has(tagName)) {
            tagFiles.set(tagName, { jsonFiles: [], deletedFiles: /* @__PURE__ */ new Set() });
          }
          tagFiles.get(tagName).deletedFiles.add(refFile);
        } else if (jsonMatch) {
          const tagName = jsonMatch[1];
          if (!tagFiles.has(tagName)) {
            tagFiles.set(tagName, { jsonFiles: [], deletedFiles: /* @__PURE__ */ new Set() });
          }
          tagFiles.get(tagName).jsonFiles.push(path);
        }
      }
    } catch (error) {
      if (isAbortError(error)) {
        throw error;
      }
      throw new Error("Cannot list tags: storage does not support listing");
    }
    const result = [];
    for (const [tagName, { jsonFiles, deletedFiles }] of tagFiles) {
      if (jsonFiles.length === 0) continue;
      jsonFiles.sort();
      const latestRef = jsonFiles[jsonFiles.length - 1];
      if (!deletedFiles.has(latestRef)) {
        result.push(tagName);
      }
    }
    return result;
  }
  /**
   * Checkout a branch to get a read session.
   *
   * @param name - Branch name
   * @param options - Optional request options (signal for cancellation)
   * @returns Read session at the branch's current snapshot
   */
  async checkoutBranch(name, options) {
    const repoInfo = await this.loadRepoInfo(options);
    if (repoInfo) {
      const snapshotId2 = resolveBranch(repoInfo, name);
      if (!snapshotId2) {
        throw new Error(`Branch not found: ${name}`);
      }
      return ReadSession.open(this.storage, snapshotId2, {
        ...options,
        virtualChunkContainers: repoInfo.virtualChunkContainers
      });
    }
    const refDirPath = getBranchRefDirPath(name);
    const refPath = await this.findLatestRefFile(
      refDirPath,
      getBranchRefPath(name)
    );
    if (!refPath) {
      throw new Error(`Reference not found: ${refDirPath}`);
    }
    const snapshotId = await this.readSnapshotIdFromRef(refPath, options);
    return ReadSession.open(this.storage, snapshotId, options);
  }
  /**
   * Checkout a tag to get a read session.
   *
   * @param name - Tag name
   * @param options - Optional request options (signal for cancellation)
   * @returns Read session at the tag's snapshot
   */
  async checkoutTag(name, options) {
    const repoInfo = await this.loadRepoInfo(options);
    if (repoInfo) {
      const snapshotId2 = resolveTag(repoInfo, name);
      if (!snapshotId2) {
        throw new Error(`Tag not found: ${name}`);
      }
      return ReadSession.open(this.storage, snapshotId2, {
        ...options,
        virtualChunkContainers: repoInfo.virtualChunkContainers
      });
    }
    const refDirPath = getTagRefDirPath(name);
    const legacyPath = getTagRefPath(name);
    const refPath = await this.findLatestRefFile(refDirPath, legacyPath);
    if (!refPath) {
      throw new Error(`Reference not found: ${refDirPath}`);
    }
    if (refPath === legacyPath && await this.storage.exists(`${refPath}.deleted`, options)) {
      throw new Error(`Tag not found: ${name}`);
    }
    const snapshotId = await this.readSnapshotIdFromRef(refPath, options);
    return ReadSession.open(this.storage, snapshotId, options);
  }
  /**
   * Checkout a specific snapshot by ID.
   *
   * @param snapshotId - Snapshot ID (12 bytes or Base32 string)
   * @param options - Optional request options (signal for cancellation)
   * @returns Read session at the specified snapshot
   */
  async checkoutSnapshot(snapshotId, options) {
    const id = typeof snapshotId === "string" ? decodeObjectId12(snapshotId) : snapshotId;
    const repoInfo = await this.loadRepoInfo(options);
    const virtualChunkContainers = repoInfo?.virtualChunkContainers;
    return ReadSession.open(this.storage, id, {
      ...options,
      ...virtualChunkContainers && { virtualChunkContainers }
    });
  }
  /**
   * Walk the snapshot history chain starting from the given session.
   *
   * Yields `{ id, message, flushedAt, metadata }` for each snapshot,
   * walking from the current snapshot back to the root.
   *
   * @param session - Read session to start from
   * @param options - Optional request options (signal for cancellation)
   */
  async *walkHistory(session, options) {
    let current = session;
    while (current) {
      yield {
        id: encodeObjectId12(current.getSnapshotId()),
        message: current.getMessage(),
        flushedAt: current.getFlushedAt(),
        metadata: current.getSnapshotMetadata()
      };
      const parentId = current.getParentSnapshotId();
      if (!parentId) break;
      current = await this.checkoutSnapshot(parentId, options);
    }
  }
  /**
   * Get the storage backend.
   */
  getStorage() {
    return this.storage;
  }
  /** Read and parse a ref file */
  async readRef(path, options) {
    const data = await this.storage.getObject(path, void 0, options);
    const json = new TextDecoder().decode(data);
    return JSON.parse(json);
  }
  /** Read snapshot ID from a ref file */
  async readSnapshotIdFromRef(path, options) {
    try {
      const ref = await this.readRef(path, options);
      return decodeObjectId12(ref.snapshot);
    } catch (error) {
      if (error instanceof NotFoundError) {
        throw new Error(`Reference not found: ${path}`);
      }
      throw error;
    }
  }
};

// src/storage/http-storage.ts
var HttpStorage = class {
  baseUrl;
  options;
  /**
   * Create an HTTP storage backend.
   *
   * @param baseUrl - Base URL for the repository (e.g., "https://example.com/repo")
   * @param options - Additional options
   */
  constructor(baseUrl, options = {}) {
    this.baseUrl = baseUrl.replace(/\/$/, "");
    this.options = options;
  }
  /** Build full URL for a path */
  getUrl(path) {
    const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
    return `${this.baseUrl}/${normalizedPath}`;
  }
  /** Build headers for a request */
  getHeaders(range) {
    const headers = { ...this.options.headers };
    if (range) {
      headers["Range"] = `bytes=${range.start}-${range.end - 1}`;
    }
    return headers;
  }
  async getObject(path, range, options) {
    options?.signal?.throwIfAborted();
    const url = this.getUrl(path);
    const headers = this.getHeaders(range);
    let response;
    try {
      response = await fetch(url, {
        method: "GET",
        headers,
        credentials: this.options.credentials,
        cache: this.options.cache,
        signal: options?.signal
      });
    } catch (error) {
      if (isAbortError(error)) throw error;
      throw new StorageError(
        `Failed to fetch ${url}: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error : void 0
      );
    }
    if (response.status === 404) {
      throw new NotFoundError(path);
    }
    if (response.status !== 200 && response.status !== 206) {
      throw new StorageError(
        `HTTP ${response.status} ${response.statusText} for ${url}`
      );
    }
    const arrayBuffer = await response.arrayBuffer();
    return new Uint8Array(arrayBuffer);
  }
  async exists(path, options) {
    options?.signal?.throwIfAborted();
    const url = this.getUrl(path);
    try {
      const response = await fetch(url, {
        method: "HEAD",
        headers: this.options.headers,
        credentials: this.options.credentials,
        signal: options?.signal
      });
      return response.ok;
    } catch (error) {
      if (isAbortError(error)) throw error;
      return false;
    }
  }
  async *listPrefix(_prefix) {
    throw new StorageError(
      "Listing not supported for HTTP storage. Use S3Storage for listing."
    );
  }
};

// src/store.ts
var IcechunkStore = class _IcechunkStore {
  /** The underlying read session. Exposed for advanced usage. */
  session;
  fetchClient;
  validateChecksums;
  azureAccount;
  withRangeCoalescing;
  basePath = "";
  constructor(session, fetchClient, validateChecksums, azureAccount, withRangeCoalescing) {
    if (!(session instanceof ReadSession)) {
      throw new Error(
        "IcechunkStore constructor is private. Use IcechunkStore.open() instead."
      );
    }
    this.session = session;
    this.fetchClient = fetchClient;
    this.validateChecksums = validateChecksums ?? false;
    this.azureAccount = azureAccount;
    this.withRangeCoalescing = withRangeCoalescing;
  }
  static async open(arg, options = {}) {
    if (arg instanceof ReadSession) {
      return new _IcechunkStore(
        arg,
        options.fetchClient,
        options.validateChecksums,
        options.azureAccount,
        options.withRangeCoalescing
      );
    }
    const storage = typeof arg === "string" ? new HttpStorage(arg) : arg;
    const requestOptions = options.signal ? { signal: options.signal } : void 0;
    const repo = await Repository.open(
      { storage, formatVersion: options.formatVersion },
      requestOptions
    );
    const sessionOptions = {
      ...requestOptions,
      maxManifestCacheSize: options.maxManifestCacheSize
    };
    let session;
    if (options.snapshot) {
      session = await repo.checkoutSnapshot(options.snapshot, sessionOptions);
    } else if (options.tag) {
      session = await repo.checkoutTag(options.tag, sessionOptions);
    } else {
      session = await repo.checkoutBranch(
        options.branch ?? "main",
        sessionOptions
      );
    }
    return new _IcechunkStore(
      session,
      options.fetchClient,
      options.validateChecksums,
      options.azureAccount,
      options.withRangeCoalescing
    );
  }
  /**
   * Get data for a zarr key.
   *
   * zarrita calls this method with keys like:
   * - "/zarr.json" - root metadata
   * - "/array/zarr.json" - array metadata
   * - "/array/c/0/1/2" - chunk at coords [0, 1, 2]
   *
   * @param key - Absolute path (must start with "/")
   * @param opts - Optional request options (supports AbortSignal for cancellation)
   * @returns Data bytes or undefined if not found
   */
  async get(key, opts) {
    opts?.signal?.throwIfAborted();
    const parsed = parseZarrKey(key);
    const resolvedPath = this.resolvePath(parsed.path);
    try {
      if (parsed.type === "metadata") {
        const data = this.session.getRawMetadata(resolvedPath);
        return data ?? void 0;
      }
      const chunk = await this.session.getChunk(resolvedPath, parsed.coords, {
        signal: opts?.signal,
        ...this.fetchClient && { fetchClient: this.fetchClient },
        validateChecksums: this.validateChecksums,
        azureAccount: this.azureAccount,
        ...this.withRangeCoalescing && {
          withRangeCoalescing: this.withRangeCoalescing
        }
      });
      return chunk ?? void 0;
    } catch (err) {
      if (err instanceof NotFoundError) return void 0;
      throw err;
    }
  }
  /**
   * Get partial data for a zarr key.
   *
   * Required by zarrita for sharded arrays. zarrita uses this to read the
   * shard index (via suffixLength) and extract individual inner chunks
   * (via offset/length) from shard data.
   *
   * @param key - Absolute path
   * @param range - Byte range to fetch
   * @param opts - Optional request options (supports AbortSignal for cancellation)
   * @returns Data bytes or undefined if not found
   */
  async getRange(key, range, opts) {
    opts?.signal?.throwIfAborted();
    const parsed = parseZarrKey(key);
    const resolvedPath = this.resolvePath(parsed.path);
    try {
      if (parsed.type === "chunk") {
        const data2 = await this.session.getChunkRange(
          resolvedPath,
          parsed.coords,
          range,
          {
            signal: opts?.signal,
            ...this.fetchClient && { fetchClient: this.fetchClient },
            validateChecksums: this.validateChecksums,
            azureAccount: this.azureAccount,
            ...this.withRangeCoalescing && {
              withRangeCoalescing: this.withRangeCoalescing
            }
          }
        );
        return data2 ?? void 0;
      }
      const data = this.session.getRawMetadata(resolvedPath);
      if (!data) return void 0;
      if ("suffixLength" in range) {
        return data.slice(-range.suffixLength);
      }
      return data.slice(range.offset, range.offset + range.length);
    } catch (err) {
      if (err instanceof NotFoundError) return void 0;
      throw err;
    }
  }
  /** Prepend basePath to a parsed path. */
  resolvePath(path) {
    if (!this.basePath) return path;
    if (path === "/") return `/${this.basePath}`;
    return `/${this.basePath}${path}`;
  }
  /**
   * Create a store scoped to a subpath.
   *
   * The returned store shares the same session (and manifest cache)
   * but prepends `path` to all key lookups. This matches zarrita's
   * `root(store).resolve(path)` pattern.
   *
   * @param path - Subpath to scope to (e.g., "group/array")
   * @returns A new IcechunkStore scoped to the subpath
   */
  resolve(path) {
    const scoped = new _IcechunkStore(
      this.session,
      this.fetchClient,
      this.validateChecksums,
      this.azureAccount,
      this.withRangeCoalescing
    );
    const cleanPath = path.replace(/^\/+|\/+$/g, "");
    scoped.basePath = this.basePath ? `${this.basePath}/${cleanPath}` : cleanPath;
    return scoped;
  }
  /**
   * List direct children of a group by name.
   *
   * @param parentPath - Path to the parent group (use "/" for root).
   *                     When omitted, uses the store's base path (or root).
   * @returns Array of child names (e.g., ["temperature", "precipitation"])
   */
  listChildren(parentPath) {
    let path;
    if (parentPath == null) {
      path = this.basePath ? `/${this.basePath}` : "/";
    } else if (this.basePath) {
      path = `/${this.basePath}/${parentPath.replace(/^\//, "")}`.replace(/\/+/g, "/").replace(/\/+$/, "") || "/";
    } else {
      path = (parentPath.startsWith("/") ? parentPath : `/${parentPath}`).replace(
        /\/+$/,
        ""
      ) || "/";
    }
    const nodes = this.session.listChildren(path);
    return nodes.map((node) => {
      const segments = node.path.split("/");
      return segments[segments.length - 1];
    });
  }
  /**
   * List all nodes in the snapshot.
   *
   * @returns Array of all nodes
   */
  listNodes() {
    return this.session.listNodes();
  }
  /**
   * Get a node by path.
   *
   * @param path - Absolute path (e.g., "/array" or "/group/nested")
   * @returns NodeSnapshot or null if not found
   */
  getNode(path) {
    const fullPath = (this.basePath ? `/${this.basePath}/${path.replace(/^\//, "")}`.replace(/\/+/g, "/") : path).replace(/\/+$/, "") || "/";
    return this.session.getNode(fullPath);
  }
  /**
   * Get parsed Zarr metadata for a node.
   *
   * @param path - Path to the node
   * @returns Parsed JSON metadata or null if node not found
   */
  getMetadata(path) {
    const fullPath = (this.basePath ? `/${this.basePath}/${path.replace(/^\//, "")}`.replace(/\/+/g, "/") : path).replace(/\/+$/, "") || "/";
    return this.session.getMetadata(fullPath);
  }
};
function parseZarrKey(key) {
  const path = key.slice(1);
  if (path === "zarr.json") {
    return { type: "metadata", path: "/" };
  }
  if (path.endsWith("/zarr.json")) {
    const nodePath = "/" + path.slice(0, -"/zarr.json".length);
    return { type: "metadata", path: nodePath };
  }
  const chunkMatch = path.match(/^(?:(.*)\/)?c(?:\/(.*))?$/);
  if (chunkMatch) {
    const arrayPath = chunkMatch[1] ? "/" + chunkMatch[1] : "/";
    const coordsStr = chunkMatch[2] ?? "";
    const coords = coordsStr ? coordsStr.split("/").map(Number) : [];
    return { type: "chunk", path: arrayPath, coords };
  }
  return { type: "metadata", path: "/" + path };
}
export {
  CompressionAlgorithm,
  DefaultFetchClient,
  FileType,
  HeaderParseError,
  HttpStorage,
  IcechunkStore,
  LRUCache,
  NotFoundError,
  ReadSession,
  Repository,
  SpecVersion,
  StorageError,
  decodeBase32,
  decodeObjectId12,
  decodeObjectId8,
  encodeBase32,
  encodeObjectId12,
  encodeObjectId8
};
//# sourceMappingURL=index.js.map