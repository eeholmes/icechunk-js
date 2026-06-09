/**
 * Storage interface for icechunk repositories.
 */
/** Byte range for partial reads */
interface ByteRange {
    /** Start offset (inclusive) */
    start: number;
    /** End offset (exclusive) */
    end: number;
}
/**
 * Pluggable HTTP client for virtual chunk fetching.
 *
 * Use this to:
 * - Generate pre-signed S3 URLs
 * - Add authentication headers
 * - Route through a proxy
 *
 * icechunk-js handles URL translation (s3:// → https://) and builds
 * all headers (Range, If-Match, etc.) before calling fetch().
 * The client only needs to execute the HTTP request.
 */
interface FetchClient {
    fetch(url: string, init?: RequestInit): Promise<Response>;
}
/** Default FetchClient that delegates to globalThis.fetch. */
declare class DefaultFetchClient implements FetchClient {
    fetch(url: string, init?: RequestInit): Promise<Response>;
}
/** Options for storage request operations */
interface RequestOptions {
    /** AbortSignal for request cancellation */
    signal?: AbortSignal;
    /** Pluggable HTTP client for virtual chunk fetching */
    fetchClient?: FetchClient;
    /**
     * Send If-Match / If-Unmodified-Since headers on virtual chunk requests.
     *
     * When true, the storage server will return 412 Precondition Failed if
     * the underlying file has changed since the snapshot recorded its checksum.
     *
     * Defaults to false because these headers trigger CORS preflight requests
     * in browsers, and most storage servers don't whitelist them by default.
     */
    validateChecksums?: boolean;
    /**
     * Azure storage account name for translating az:// and azure:// URLs.
     *
     * Required when virtual chunks reference az:// or azure:// URLs, since
     * these schemes encode only the container name (e.g., az://container/path).
     * The account is needed to build the HTTPS endpoint:
     * https://{account}.blob.core.windows.net/{container}/{path}
     *
     * Not needed for abfs:// URLs, which embed the account in the host.
     */
    azureAccount?: string;
}
/** Error thrown when an object is not found */
declare class NotFoundError extends Error {
    readonly path: string;
    constructor(path: string);
}
/** Error thrown for storage operations */
declare class StorageError extends Error {
    readonly cause?: Error | undefined;
    constructor(message: string, cause?: Error | undefined);
}
/**
 * Storage interface for reading icechunk data.
 *
 * Implementations should handle authentication, caching, etc.
 */
interface Storage {
    /**
     * Get an object from storage.
     *
     * @param path - Path to the object (relative to repository root)
     * @param range - Optional byte range for partial reads
     * @param options - Optional request options (signal for cancellation)
     * @returns Object data as bytes
     * @throws NotFoundError if the object doesn't exist
     * @throws StorageError for other errors
     * @throws An error named "AbortError" if the operation was aborted
     */
    getObject(path: string, range?: ByteRange, options?: RequestOptions): Promise<Uint8Array>;
    /**
     * Check if an object exists.
     *
     * @param path - Path to the object
     * @param options - Optional request options (signal for cancellation)
     * @returns True if the object exists
     * @throws An error named "AbortError" if the operation was aborted
     */
    exists(path: string, options?: RequestOptions): Promise<boolean>;
    /**
     * List objects with a given prefix.
     *
     * @param prefix - Path prefix to filter by
     * @returns Async iterable of object paths
     */
    listPrefix(prefix: string): AsyncIterable<string>;
}

/** Spec version enum */
declare enum SpecVersion {
    V1_0 = 1,
    V2_0 = 2
}
/** File type enum */
declare enum FileType {
    Snapshot = 1,
    Manifest = 2,
    Attributes = 3,
    TransactionLog = 4,
    Chunk = 5,
    RepoInfo = 6
}
/** Compression algorithm enum */
declare enum CompressionAlgorithm {
    None = 0,
    Zstd = 1
}
/** Error thrown when header parsing fails */
declare class HeaderParseError extends Error {
    constructor(message: string);
}

/**
 * TypeScript types matching the icechunk FlatBuffer schemas.
 *
 * These types represent the parsed/decoded data, not the binary format.
 */
/** 12-byte object ID (SnapshotId, ManifestId, ChunkId) */
type ObjectId12 = Uint8Array;
/** 8-byte object ID (NodeId) */
type ObjectId8 = Uint8Array;
/** Metadata key-value pair */
interface MetadataItem {
    name: string;
    /** Value serialized as MessagePack (v1) or FlexBuffers (v2) */
    value: Uint8Array;
}
/** Reference to a chunk - can be inline, native, or virtual */
interface ChunkRef {
    /** Chunk coordinates (N-dimensional) */
    index: number[];
    /** Inline chunk data (if present, this is an inline chunk) */
    inline: Uint8Array | null;
    /** Byte offset within the chunk file or virtual location */
    offset: number;
    /** Byte length of the chunk data */
    length: number;
    /** Chunk ID for native chunks (points to file in chunks/) */
    chunkId: ObjectId12 | null;
    /** URL for virtual chunks */
    location: string | null;
    /** Dictionary-compressed virtual location bytes */
    compressedLocation?: Uint8Array | null;
    /** ETag checksum for virtual chunks */
    checksumEtag: string | null;
    /** Last modified timestamp (seconds since epoch) for virtual chunks */
    checksumLastModified: number;
}
/** Chunk references for a single array */
interface ArrayManifest {
    /** Node ID of the array */
    nodeId: ObjectId8;
    /** Chunk references, sorted by index */
    refs: ChunkRef[];
}
/** Manifest containing chunk references for multiple arrays */
interface Manifest {
    /** Manifest ID */
    id: ObjectId12;
    /** Array manifests, sorted by nodeId */
    arrays: ArrayManifest[];
    /** Optional zstd dictionary used for compressed virtual chunk locations */
    locationDictionary?: Uint8Array | null;
    /** Compression algorithm for compressed virtual chunk locations */
    compressionAlgorithm?: number;
}
/** Info about a manifest file */
interface ManifestFileInfo {
    /** Manifest ID */
    id: ObjectId12;
    /** Size in bytes */
    sizeBytes: number;
    /** Number of chunk refs in the manifest */
    numChunkRefs: number;
}
/** Range of chunk indices along one dimension */
interface ChunkIndexRange {
    /** Inclusive start */
    from: number;
    /** Exclusive end */
    to: number;
}
/** Reference to a manifest with extent information */
interface ManifestRef {
    /** Manifest object ID */
    objectId: ObjectId12;
    /** Chunk index ranges per dimension */
    extents: ChunkIndexRange[];
}
/** Shape of one dimension */
interface DimensionShape {
    /** Length of the array along this dimension */
    arrayLength: number;
    /** Chunk size along this dimension (v1 format; approximate in v2) */
    chunkLength: number;
    /** Number of chunks along this dimension (v2 format) */
    numChunks?: number;
}
/** Group node data (empty - just a marker) */
interface GroupNodeData {
    type: "group";
}
/** Array node data */
interface ArrayNodeData {
    type: "array";
    /** Shape per dimension */
    shape: DimensionShape[];
    /** Optional dimension names */
    dimensionNames: (string | null)[];
    /** Manifest references */
    manifests: ManifestRef[];
}
/** Node data - either group or array */
type NodeData = GroupNodeData | ArrayNodeData;
/** Snapshot of a single node (array or group) */
interface NodeSnapshot {
    /** Node ID */
    id: ObjectId8;
    /** Absolute path in the repository */
    path: string;
    /** User data (typically Zarr metadata JSON) */
    userData: Uint8Array;
    /** Node-specific data */
    nodeData: NodeData;
}
/** Complete snapshot of a repository state */
interface Snapshot {
    /** Snapshot ID */
    id: ObjectId12;
    /** Parent snapshot ID (null for root snapshot) */
    parentId: ObjectId12 | null;
    /** Nodes in the snapshot, sorted by path */
    nodes: NodeSnapshot[];
    /** Timestamp when flushed (microseconds since epoch) */
    flushedAt: bigint;
    /** Commit message */
    message: string;
    /** Snapshot metadata */
    metadata: MetadataItem[];
    /** All manifest files referenced by this snapshot */
    manifestFiles: ManifestFileInfo[];
}
/** Inline chunk - data embedded in manifest */
interface InlineChunkPayload {
    type: "inline";
    data: Uint8Array;
}
/** Native chunk - stored in repository's chunk storage */
interface NativeChunkPayload {
    type: "native";
    chunkId: ObjectId12;
    offset: number;
    length: number;
}
/** Virtual chunk - stored externally */
interface VirtualChunkPayload {
    type: "virtual";
    location: string | null;
    compressedLocation?: Uint8Array | null;
    offset: number;
    length: number;
    checksumEtag: string | null;
    checksumLastModified: number;
}
/** Union of all chunk payload types */
type ChunkPayload = InlineChunkPayload | NativeChunkPayload | VirtualChunkPayload;
/** Chunk coordinates that were updated */
interface UpdatedChunkIndices {
    coords: number[];
}
/** Updated chunks info for a single array */
interface ArrayUpdatedChunksInfo {
    nodeId: ObjectId8;
    chunks: UpdatedChunkIndices[];
}
/** A node move operation */
interface MoveOperationInfo {
    from: string;
    to: string;
}
/** A transaction log entry describing changes in a snapshot */
interface TransactionLogEntry {
    id: ObjectId12;
    newGroups: ObjectId8[];
    newArrays: ObjectId8[];
    deletedGroups: ObjectId8[];
    deletedArrays: ObjectId8[];
    updatedArrays: ObjectId8[];
    updatedGroups: ObjectId8[];
    updatedChunks: ArrayUpdatedChunksInfo[];
    movedNodes: MoveOperationInfo[];
}

/**
 * Adapters for zarrita's `withRangeCoalescing` (added in zarrita 0.7).
 *
 * The coalescer works over any range-readable store keyed by object path.
 * These adapters expose icechunk's two backing-object cases in that shape:
 *
 * - `makeUrlStore` fetches ranges from one external virtual-chunk URL.
 * - `makeStorageStore` fetches ranges from repository storage objects.
 *
 * Callers pass `zarrita.withRangeCoalescing` into icechunk-js explicitly when
 * they want coalescing, keeping zarrita a true optional dependency.
 */

type RangeQuery$1 = {
    offset: number;
    length: number;
} | {
    suffixLength: number;
};
interface GetOptions {
    signal?: AbortSignal;
}
interface AsyncReadable$1 {
    get(key: string, options?: GetOptions): Promise<Uint8Array | undefined>;
    getRange(key: string, range: RangeQuery$1, options?: GetOptions): Promise<Uint8Array | undefined>;
}
type RangeCoalescingFn = (store: AsyncReadable$1, opts?: {
    coalesceSize?: number;
}) => AsyncReadable$1;

/**
 * ReadSession - Read-only session for accessing icechunk data.
 */

/** Options for chunk reads from a ReadSession. */
interface ReadOptions extends RequestOptions {
    /**
     * Zarrita-backed range coalescing function for chunk payload reads.
     *
     * Pass `zarrita.withRangeCoalescing` to opt in. Concurrent range reads
     * against the same backing object may be merged into one larger request,
     * matching zarrita's abort behavior for merged signals.
     */
    withRangeCoalescing?: RangeCoalescingFn;
}
/**
 * ReadSession provides read access to a specific snapshot.
 *
 * Use this class to:
 * - Get nodes (arrays/groups) by path
 * - Read chunk data
 * - Access Zarr metadata
 */
declare class ReadSession {
    private storage;
    private snapshot;
    private specVersion;
    private manifestCache;
    /**
     * Single-flight loader over `manifestCache`: concurrent misses for the
     * same manifest share one fetch instead of racing N identical GETs.
     * Critical for fan-out reads that all need the same manifest (e.g. the
     * many parallel chunk reads issued when a renderer crosses into a new
     * pyramid level).
     */
    private manifestLoader;
    /**
     * Bounded cache of `AsyncReadable`s wrapped with zarrita's range coalescer.
     * The cache key includes request-option identities that must not share one
     * coalescing queue, notably virtual fetch clients and checksum headers.
     *
     * Promise slots are inserted synchronously on first use, so
     * concurrent requests for the same partition share one coalescing window
     * instead of racing to create parallel stores.
     */
    private rangeStores?;
    private nativeStore?;
    private fetchClientIds?;
    private nextFetchClientId;
    private rangeCoalescerIds?;
    private nextRangeCoalescerId;
    /** VCC name → url_prefix map for resolving `vcc://` chunk locations. */
    private virtualChunkContainers;
    private constructor();
    private getFetchClientKey;
    private getRangeCoalescerKey;
    private getRangeStore;
    private getNativeStore;
    private getVirtualStoreForPayload;
    /**
     * Open a read session for a specific snapshot.
     *
     * @param storage - Storage backend
     * @param snapshotId - Snapshot ID (12 bytes)
     * @param options - Optional request options (signal for cancellation)
     * @returns ReadSession instance
     */
    static open(storage: Storage, snapshotId: Uint8Array, options?: RequestOptions & {
        maxManifestCacheSize?: number;
        virtualChunkContainers?: Map<string, string>;
    }): Promise<ReadSession>;
    /** Load and parse a snapshot from storage */
    private static loadSnapshot;
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
    private loadManifest;
    /**
     * Fetch and parse a single manifest. The `signal` here is the
     * single-flight loader's own signal — it fires only when every waiter
     * has aborted, so a hung manifest fetch doesn't trap later callers
     * behind it.
     */
    private fetchManifest;
    /**
     * Get the snapshot ID.
     */
    getSnapshotId(): ObjectId12;
    /**
     * Get the spec version of the snapshot.
     */
    getSpecVersion(): SpecVersion;
    /**
     * Get the parent snapshot ID, or null for root snapshots.
     */
    getParentSnapshotId(): ObjectId12 | null;
    /**
     * Get the commit message for this snapshot.
     */
    getMessage(): string;
    /**
     * Get the timestamp when this snapshot was created.
     */
    getFlushedAt(): Date;
    /**
     * Get deserialized snapshot metadata.
     *
     * Decodes MessagePack (v1) or FlexBuffers (v2) metadata items
     * into a plain key-value object.
     */
    getSnapshotMetadata(): Record<string, unknown>;
    /**
     * Load and parse the transaction log for this snapshot.
     *
     * Returns null if no transaction log exists (e.g., root snapshot).
     *
     * @param options - Optional request options (signal for cancellation)
     * @returns Parsed transaction log entry or null
     */
    loadTransactionLog(options?: RequestOptions): Promise<TransactionLogEntry | null>;
    /**
     * Get a node by path.
     *
     * @param path - Absolute path (e.g., "/array" or "/group/nested")
     * @returns NodeSnapshot or null if not found
     */
    getNode(path: string): NodeSnapshot | null;
    /**
     * List all nodes in the snapshot.
     *
     * @returns Array of all nodes
     */
    listNodes(): NodeSnapshot[];
    /**
     * List children of a group.
     *
     * @param parentPath - Path to the parent group (use "/" for root)
     * @returns Array of child nodes
     */
    listChildren(parentPath: string): NodeSnapshot[];
    /**
     * Get the Zarr metadata for a node.
     *
     * @param path - Path to the node
     * @returns Parsed JSON metadata or null if node not found
     */
    getMetadata(path: string): unknown | null;
    /**
     * Get raw user data (Zarr metadata bytes) for a node.
     *
     * @param path - Path to the node
     * @returns Raw metadata bytes or null if node not found
     */
    getRawMetadata(path: string): Uint8Array | null;
    /**
     * Read chunk data for an array.
     *
     * @param path - Path to the array
     * @param coords - Chunk coordinates (N-dimensional)
     * @param options - Optional request options (signal for cancellation)
     * @returns Chunk data bytes or null if not found
     */
    getChunk(path: string, coords: number[], options?: ReadOptions): Promise<Uint8Array | null>;
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
    getChunkRange(path: string, coords: number[], range: {
        offset: number;
        length: number;
    } | {
        suffixLength: number;
    }, options?: ReadOptions): Promise<Uint8Array | null>;
    /** Check if coordinates fall within extent ranges */
    private coordsInExtents;
    /** Fetch chunk data based on payload type */
    private fetchChunkPayload;
    /** Fetch a byte range of chunk data based on payload type */
    private fetchChunkPayloadRange;
    private resolveVirtualLocation;
    /** Binary search for a node by path */
    private binarySearchNode;
}

/**
 * IcechunkStore - zarrita-compatible store adapter.
 *
 * Implements zarrita's AsyncReadable interface to allow using
 * zarrita for array operations on icechunk repositories.
 */

/**
 * zarrita's AbsolutePath type - paths must start with "/"
 */
type AbsolutePath<Rest extends string = string> = `/${Rest}`;
/**
 * zarrita's RangeQuery type for partial reads
 */
type RangeQuery = {
    offset: number;
    length: number;
} | {
    suffixLength: number;
};
/**
 * zarrita's AsyncReadable interface
 */
interface AsyncReadable<Options = unknown> {
    get(key: AbsolutePath, opts?: Options): Promise<Uint8Array | undefined>;
    getRange?(key: AbsolutePath, range: RangeQuery, opts?: Options): Promise<Uint8Array | undefined>;
}
/** Options for IcechunkStore */
interface IcechunkStoreOptions {
    /** Branch name to checkout (default: "main") */
    branch?: string;
    /** Tag name to checkout (mutually exclusive with branch) */
    tag?: string;
    /** Specific snapshot ID to checkout (Base32 string) */
    snapshot?: string;
    /** AbortSignal for cancelling initialization */
    signal?: AbortSignal;
    /** Format version hint to skip auto-detection. 'v1' skips /repo request. */
    formatVersion?: "v1" | "v2";
    /**
     * Pluggable HTTP client for virtual chunk fetching.
     *
     * Use this to:
     * - Generate pre-signed S3 URLs
     * - Add authentication headers
     * - Route through a proxy
     */
    fetchClient?: FetchClient;
    /** Maximum number of manifests to cache in the LRU cache (default: 100) */
    maxManifestCacheSize?: number;
    /**
     * Zarrita-backed range coalescing function for chunk payload reads.
     *
     * Pass `zarrita.withRangeCoalescing` to opt in. Concurrent range reads
     * against the same backing object may be merged into one larger request.
     */
    withRangeCoalescing?: RangeCoalescingFn;
    /**
     * Send If-Match / If-Unmodified-Since headers on virtual chunk requests.
     *
     * Defaults to false because these headers trigger CORS preflight in browsers.
     */
    validateChecksums?: boolean;
    /**
     * Azure storage account name for translating az:// and azure:// URLs.
     *
     * Required when virtual chunks reference az:// or azure:// URLs.
     * Not needed for abfs:// URLs which embed the account in the host.
     */
    azureAccount?: string;
}
/**
 * IcechunkStore - zarrita-compatible store for icechunk repositories.
 *
 * This store implements zarrita's AsyncReadable interface, allowing you
 * to use zarrita's array operations on icechunk data.
 *
 * @example
 * ```typescript
 * import { IcechunkStore } from 'icechunk-js';
 * import { open, get } from 'zarrita';
 *
 * const store = await IcechunkStore.open('https://bucket.s3.amazonaws.com/repo');
 * const array = await open(store.resolve('/temperature'), { kind: 'array' });
 * const data = await get(array, [0, 0, null]);
 * ```
 */
declare class IcechunkStore implements AsyncReadable {
    /** The underlying read session. Exposed for advanced usage. */
    readonly session: ReadSession;
    private fetchClient?;
    private validateChecksums;
    private azureAccount?;
    private withRangeCoalescing?;
    private basePath;
    private constructor();
    /**
     * Open an IcechunkStore from a URL.
     *
     * @param url - URL to the icechunk repository
     * @param options - Store options (branch, tag, or snapshot to checkout)
     */
    static open(url: string, options?: IcechunkStoreOptions): Promise<IcechunkStore>;
    /**
     * Open an IcechunkStore from an existing ReadSession.
     *
     * @param session - Existing ReadSession
     * @param options - Store options for virtual chunk reads
     */
    static open(session: ReadSession, options?: Pick<IcechunkStoreOptions, "fetchClient" | "validateChecksums" | "azureAccount" | "withRangeCoalescing">): Promise<IcechunkStore>;
    /**
     * Open an IcechunkStore from a custom Storage backend.
     *
     * @param storage - Custom Storage implementation
     * @param options - Store options (branch, tag, or snapshot to checkout)
     */
    static open(storage: Storage, options?: IcechunkStoreOptions): Promise<IcechunkStore>;
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
    get(key: AbsolutePath, opts?: {
        signal?: AbortSignal;
    }): Promise<Uint8Array | undefined>;
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
    getRange(key: AbsolutePath, range: RangeQuery, opts?: {
        signal?: AbortSignal;
    }): Promise<Uint8Array | undefined>;
    /** Prepend basePath to a parsed path. */
    private resolvePath;
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
    resolve(path: string): IcechunkStore;
    /**
     * List direct children of a group by name.
     *
     * @param parentPath - Path to the parent group (use "/" for root).
     *                     When omitted, uses the store's base path (or root).
     * @returns Array of child names (e.g., ["temperature", "precipitation"])
     */
    listChildren(parentPath?: string): string[];
    /**
     * List all nodes in the snapshot.
     *
     * @returns Array of all nodes
     */
    listNodes(): NodeSnapshot[];
    /**
     * Get a node by path.
     *
     * @param path - Absolute path (e.g., "/array" or "/group/nested")
     * @returns NodeSnapshot or null if not found
     */
    getNode(path: string): NodeSnapshot | null;
    /**
     * Get parsed Zarr metadata for a node.
     *
     * @param path - Path to the node
     * @returns Parsed JSON metadata or null if node not found
     */
    getMetadata(path: string): unknown | null;
}

/**
 * Repository - Entry point for reading icechunk repositories.
 */

/** Reference data stored in ref.json files */
interface RefData {
    /** Base32-encoded snapshot ID */
    snapshot: string;
}
/** Options for opening a repository */
interface RepositoryOptions {
    /** Storage backend to use */
    storage: Storage;
    /** Format version hint to skip auto-detection. 'v1' skips /repo request. */
    formatVersion?: "v1" | "v2";
}
/**
 * Repository provides access to an icechunk repository.
 *
 * Use this class to:
 * - List branches and tags
 * - Checkout a specific version to get a ReadSession
 */
declare class Repository {
    private storage;
    private repoInfo;
    private repoInfoAttempted;
    private constructor();
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
    private loadRepoInfo;
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
    static open(options: RepositoryOptions, requestOptions?: RequestOptions): Promise<Repository>;
    /**
     * Check if any ref file exists in a directory.
     * Ref files are .json files that are not .deleted files.
     *
     * @param dirPrefix - Directory prefix to check
     * @param legacyPath - Optional legacy ref.json path to check if listing fails
     * @param options - Optional request options (signal for cancellation)
     */
    private hasAnyRefFile;
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
    private findLatestRefFile;
    /**
     * List all branches in the repository.
     *
     * Unlike tags, branches in icechunk v1 have no tombstone mechanism —
     * deletion removes the ref file outright. A branch is present iff it has
     * at least one ref file in its directory.
     *
     * @returns Array of branch names
     */
    listBranches(): Promise<string[]>;
    /**
     * List all tags in the repository.
     *
     * Tags with deletion tombstones on their latest ref file are excluded.
     *
     * @returns Array of tag names
     */
    listTags(): Promise<string[]>;
    /**
     * Checkout a branch to get a read session.
     *
     * @param name - Branch name
     * @param options - Optional request options (signal for cancellation)
     * @returns Read session at the branch's current snapshot
     */
    checkoutBranch(name: string, options?: RequestOptions): Promise<ReadSession>;
    /**
     * Checkout a tag to get a read session.
     *
     * @param name - Tag name
     * @param options - Optional request options (signal for cancellation)
     * @returns Read session at the tag's snapshot
     */
    checkoutTag(name: string, options?: RequestOptions): Promise<ReadSession>;
    /**
     * Checkout a specific snapshot by ID.
     *
     * @param snapshotId - Snapshot ID (12 bytes or Base32 string)
     * @param options - Optional request options (signal for cancellation)
     * @returns Read session at the specified snapshot
     */
    checkoutSnapshot(snapshotId: Uint8Array | string, options?: RequestOptions): Promise<ReadSession>;
    /**
     * Walk the snapshot history chain starting from the given session.
     *
     * Yields `{ id, message, flushedAt, metadata }` for each snapshot,
     * walking from the current snapshot back to the root.
     *
     * @param session - Read session to start from
     * @param options - Optional request options (signal for cancellation)
     */
    walkHistory(session: ReadSession, options?: RequestOptions): AsyncGenerator<{
        id: string;
        message: string;
        flushedAt: Date;
        metadata: Record<string, unknown>;
    }>;
    /**
     * Get the storage backend.
     */
    getStorage(): Storage;
    /** Read and parse a ref file */
    private readRef;
    /** Read snapshot ID from a ref file */
    private readSnapshotIdFromRef;
}

/**
 * HTTP/HTTPS storage backend using the Fetch API.
 *
 * Works in both Node.js 18+ and browsers.
 */

/** Options for HTTP storage */
interface HttpStorageOptions {
    /** Additional headers to include in requests */
    headers?: Record<string, string>;
    /** Fetch credentials mode */
    credentials?: RequestCredentials;
    /** Fetch cache mode */
    cache?: RequestCache;
}
/**
 * HTTP/HTTPS storage backend.
 *
 * Reads objects from a base URL using HTTP GET requests.
 * Supports byte range requests for partial reads.
 */
declare class HttpStorage implements Storage {
    private baseUrl;
    private options;
    /**
     * Create an HTTP storage backend.
     *
     * @param baseUrl - Base URL for the repository (e.g., "https://example.com/repo")
     * @param options - Additional options
     */
    constructor(baseUrl: string, options?: HttpStorageOptions);
    /** Build full URL for a path */
    private getUrl;
    /** Build headers for a request */
    private getHeaders;
    getObject(path: string, range?: ByteRange, options?: RequestOptions): Promise<Uint8Array>;
    exists(path: string, options?: RequestOptions): Promise<boolean>;
    listPrefix(_prefix: string): AsyncIterable<string>;
}

/**
 * Simple LRU cache for manifests and snapshots.
 */
declare class LRUCache<K, V> {
    private cache;
    private readonly maxSize;
    constructor(maxSize: number);
    get(key: K): V | undefined;
    set(key: K, value: V): void;
    has(key: K): boolean;
    delete(key: K): boolean;
    clear(): void;
    get size(): number;
}

/**
 * Object ID encoding/decoding using Base32 Crockford.
 *
 * Icechunk uses Base32 Crockford for encoding object IDs:
 * - 12-byte IDs (SnapshotId, ManifestId, ChunkId) → 20 characters
 * - 8-byte IDs (NodeId) → 13 characters
 *
 * Crockford Base32 alphabet: 0123456789ABCDEFGHJKMNPQRSTVWXYZ
 * (excludes I, L, O, U to avoid confusion)
 */
/**
 * Encode bytes to Base32 Crockford string.
 *
 * @param bytes - Bytes to encode
 * @returns Base32 Crockford encoded string (uppercase)
 */
declare function encodeBase32(bytes: Uint8Array): string;
/**
 * Decode Base32 Crockford string to bytes.
 *
 * @param str - Base32 Crockford encoded string
 * @returns Decoded bytes
 * @throws Error if the string contains invalid characters
 */
declare function decodeBase32(str: string): Uint8Array;
/**
 * Encode a 12-byte object ID to string.
 *
 * @param id - 12-byte ID
 * @returns Base32 Crockford encoded string (20 characters)
 */
declare function encodeObjectId12(id: Uint8Array): string;
/**
 * Decode a string to 12-byte object ID.
 *
 * @param str - Base32 Crockford encoded string
 * @returns 12-byte ID
 */
declare function decodeObjectId12(str: string): Uint8Array;
/**
 * Encode an 8-byte object ID to string.
 *
 * @param id - 8-byte ID
 * @returns Base32 Crockford encoded string (13 characters)
 */
declare function encodeObjectId8(id: Uint8Array): string;
/**
 * Decode a string to 8-byte object ID.
 *
 * @param str - Base32 Crockford encoded string
 * @returns 8-byte ID
 */
declare function decodeObjectId8(str: string): Uint8Array;

export { type AbsolutePath, type ArrayManifest, type ArrayNodeData, type ArrayUpdatedChunksInfo, type AsyncReadable, type ByteRange, type ChunkIndexRange, type ChunkPayload, type ChunkRef, CompressionAlgorithm, DefaultFetchClient, type DimensionShape, type FetchClient, FileType, type GroupNodeData, HeaderParseError, HttpStorage, type HttpStorageOptions, IcechunkStore, type IcechunkStoreOptions, type InlineChunkPayload, LRUCache, type Manifest, type ManifestFileInfo, type ManifestRef, type MetadataItem, type MoveOperationInfo, type NativeChunkPayload, type NodeData, type NodeSnapshot, NotFoundError, type ObjectId12, type ObjectId8, type RangeCoalescingFn, type RangeQuery, type ReadOptions, ReadSession, type RefData, Repository, type RepositoryOptions, type RequestOptions, type Snapshot, SpecVersion, type Storage, StorageError, type TransactionLogEntry, type UpdatedChunkIndices, type VirtualChunkPayload, decodeBase32, decodeObjectId12, decodeObjectId8, encodeBase32, encodeObjectId12, encodeObjectId8 };
