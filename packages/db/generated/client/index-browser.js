
Object.defineProperty(exports, "__esModule", { value: true });

const {
  Decimal,
  objectEnumValues,
  makeStrictEnum,
  Public,
  getRuntime,
  skip
} = require('./runtime/index-browser.js')


const Prisma = {}

exports.Prisma = Prisma
exports.$Enums = {}

/**
 * Prisma Client JS version: 5.22.0
 * Query Engine version: 605197351a3c8bdd595af2d2a9bc3025bca48ea2
 */
Prisma.prismaVersion = {
  client: "5.22.0",
  engine: "605197351a3c8bdd595af2d2a9bc3025bca48ea2"
}

Prisma.PrismaClientKnownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientKnownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)};
Prisma.PrismaClientUnknownRequestError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientUnknownRequestError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientRustPanicError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientRustPanicError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientInitializationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientInitializationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.PrismaClientValidationError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`PrismaClientValidationError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.NotFoundError = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`NotFoundError is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.Decimal = Decimal

/**
 * Re-export of sql-template-tag
 */
Prisma.sql = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`sqltag is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.empty = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`empty is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.join = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`join is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.raw = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`raw is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.validator = Public.validator

/**
* Extensions
*/
Prisma.getExtensionContext = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.getExtensionContext is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}
Prisma.defineExtension = () => {
  const runtimeName = getRuntime().prettyName;
  throw new Error(`Extensions.defineExtension is unable to run in this browser environment, or has been bundled for the browser (running in ${runtimeName}).
In case this error is unexpected for you, please report it in https://pris.ly/prisma-prisma-bug-report`,
)}

/**
 * Shorthand utilities for JSON filtering
 */
Prisma.DbNull = objectEnumValues.instances.DbNull
Prisma.JsonNull = objectEnumValues.instances.JsonNull
Prisma.AnyNull = objectEnumValues.instances.AnyNull

Prisma.NullTypes = {
  DbNull: objectEnumValues.classes.DbNull,
  JsonNull: objectEnumValues.classes.JsonNull,
  AnyNull: objectEnumValues.classes.AnyNull
}



/**
 * Enums
 */

exports.Prisma.TransactionIsolationLevel = makeStrictEnum({
  ReadUncommitted: 'ReadUncommitted',
  ReadCommitted: 'ReadCommitted',
  RepeatableRead: 'RepeatableRead',
  Serializable: 'Serializable'
});

exports.Prisma.UserScalarFieldEnum = {
  id: 'id',
  name: 'name',
  email: 'email',
  emailVerified: 'emailVerified',
  image: 'image',
  phone: 'phone',
  phoneVerifiedAt: 'phoneVerifiedAt',
  onboardingCompletedAt: 'onboardingCompletedAt',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.AccountScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  type: 'type',
  provider: 'provider',
  providerAccountId: 'providerAccountId',
  refresh_token: 'refresh_token',
  access_token: 'access_token',
  expires_at: 'expires_at',
  token_type: 'token_type',
  scope: 'scope',
  id_token: 'id_token',
  session_state: 'session_state'
};

exports.Prisma.SessionScalarFieldEnum = {
  sessionToken: 'sessionToken',
  userId: 'userId',
  expires: 'expires'
};

exports.Prisma.VerificationTokenScalarFieldEnum = {
  identifier: 'identifier',
  token: 'token',
  expires: 'expires'
};

exports.Prisma.InternalApiNonceScalarFieldEnum = {
  nonce: 'nonce',
  expiresAt: 'expiresAt'
};

exports.Prisma.PhoneOtpScalarFieldEnum = {
  id: 'id',
  phone: 'phone',
  codeHash: 'codeHash',
  attempts: 'attempts',
  expiresAt: 'expiresAt',
  consumedAt: 'consumedAt',
  createdAt: 'createdAt'
};

exports.Prisma.OrganizationScalarFieldEnum = {
  id: 'id',
  name: 'name',
  slug: 'slug',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.MembershipScalarFieldEnum = {
  id: 'id',
  userId: 'userId',
  organizationId: 'organizationId',
  role: 'role',
  createdAt: 'createdAt'
};

exports.Prisma.WorkspaceScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  name: 'name',
  slug: 'slug',
  createdById: 'createdById',
  createdAt: 'createdAt'
};

exports.Prisma.ProjectScalarFieldEnum = {
  id: 'id',
  organizationId: 'organizationId',
  workspaceId: 'workspaceId',
  name: 'name',
  slug: 'slug',
  domain: 'domain',
  createdById: 'createdById',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.KeywordTrackingSettingScalarFieldEnum = {
  id: 'id',
  projectId: 'projectId',
  countryCode: 'countryCode',
  languageCode: 'languageCode',
  locationName: 'locationName',
  device: 'device',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SearchConsoleConnectionScalarFieldEnum = {
  id: 'id',
  projectId: 'projectId',
  userId: 'userId',
  property: 'property',
  status: 'status',
  scopes: 'scopes',
  accessTokenEnc: 'accessTokenEnc',
  refreshTokenEnc: 'refreshTokenEnc',
  expiresAt: 'expiresAt',
  nextSyncAt: 'nextSyncAt',
  syncLeaseId: 'syncLeaseId',
  syncLeaseUntil: 'syncLeaseUntil',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.SearchConsoleSyncRunScalarFieldEnum = {
  id: 'id',
  connectionId: 'connectionId',
  status: 'status',
  rangeStart: 'rangeStart',
  rangeEnd: 'rangeEnd',
  rowsUpserted: 'rowsUpserted',
  errorMessage: 'errorMessage',
  startedAt: 'startedAt',
  completedAt: 'completedAt'
};

exports.Prisma.SearchConsoleQueryMetricScalarFieldEnum = {
  id: 'id',
  connectionId: 'connectionId',
  date: 'date',
  query: 'query',
  clicks: 'clicks',
  impressions: 'impressions',
  ctr: 'ctr',
  position: 'position',
  createdAt: 'createdAt'
};

exports.Prisma.SearchConsolePageMetricScalarFieldEnum = {
  id: 'id',
  connectionId: 'connectionId',
  date: 'date',
  page: 'page',
  clicks: 'clicks',
  impressions: 'impressions',
  ctr: 'ctr',
  position: 'position',
  createdAt: 'createdAt'
};

exports.Prisma.SearchConsoleOpportunityMetricScalarFieldEnum = {
  id: 'id',
  connectionId: 'connectionId',
  date: 'date',
  query: 'query',
  page: 'page',
  clicks: 'clicks',
  impressions: 'impressions',
  ctr: 'ctr',
  position: 'position',
  createdAt: 'createdAt'
};

exports.Prisma.TrackedKeywordScalarFieldEnum = {
  id: 'id',
  projectId: 'projectId',
  userId: 'userId',
  query: 'query',
  targetPage: 'targetPage',
  createdAt: 'createdAt',
  updatedAt: 'updatedAt'
};

exports.Prisma.KeywordRankSnapshotScalarFieldEnum = {
  id: 'id',
  trackedKeywordId: 'trackedKeywordId',
  checkDate: 'checkDate',
  provider: 'provider',
  device: 'device',
  locationCode: 'locationCode',
  rankAbsolute: 'rankAbsolute',
  rankGroup: 'rankGroup',
  resultUrl: 'resultUrl',
  serpFeatures: 'serpFeatures',
  costUsd: 'costUsd',
  checkedAt: 'checkedAt'
};

exports.Prisma.KeywordSerpTaskScalarFieldEnum = {
  id: 'id',
  trackedKeywordId: 'trackedKeywordId',
  externalTaskId: 'externalTaskId',
  checkDate: 'checkDate',
  device: 'device',
  locationCode: 'locationCode',
  status: 'status',
  costUsd: 'costUsd',
  errorMessage: 'errorMessage',
  requestedAt: 'requestedAt',
  completedAt: 'completedAt'
};

exports.Prisma.SearchConsoleOAuthStateScalarFieldEnum = {
  id: 'id',
  stateHash: 'stateHash',
  codeVerifierEnc: 'codeVerifierEnc',
  projectId: 'projectId',
  userId: 'userId',
  property: 'property',
  expiresAt: 'expiresAt',
  consumedAt: 'consumedAt',
  createdAt: 'createdAt'
};

exports.Prisma.SortOrder = {
  asc: 'asc',
  desc: 'desc'
};

exports.Prisma.QueryMode = {
  default: 'default',
  insensitive: 'insensitive'
};

exports.Prisma.NullsOrder = {
  first: 'first',
  last: 'last'
};
exports.MembershipRole = exports.$Enums.MembershipRole = {
  OWNER: 'OWNER',
  ADMIN: 'ADMIN',
  MEMBER: 'MEMBER'
};

exports.SearchConsoleStatus = exports.$Enums.SearchConsoleStatus = {
  PENDING: 'PENDING',
  CONNECTED: 'CONNECTED',
  REVOKED: 'REVOKED',
  ERROR: 'ERROR'
};

exports.SearchConsoleSyncStatus = exports.$Enums.SearchConsoleSyncStatus = {
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED'
};

exports.Prisma.ModelName = {
  User: 'User',
  Account: 'Account',
  Session: 'Session',
  VerificationToken: 'VerificationToken',
  InternalApiNonce: 'InternalApiNonce',
  PhoneOtp: 'PhoneOtp',
  Organization: 'Organization',
  Membership: 'Membership',
  Workspace: 'Workspace',
  Project: 'Project',
  KeywordTrackingSetting: 'KeywordTrackingSetting',
  SearchConsoleConnection: 'SearchConsoleConnection',
  SearchConsoleSyncRun: 'SearchConsoleSyncRun',
  SearchConsoleQueryMetric: 'SearchConsoleQueryMetric',
  SearchConsolePageMetric: 'SearchConsolePageMetric',
  SearchConsoleOpportunityMetric: 'SearchConsoleOpportunityMetric',
  TrackedKeyword: 'TrackedKeyword',
  KeywordRankSnapshot: 'KeywordRankSnapshot',
  KeywordSerpTask: 'KeywordSerpTask',
  SearchConsoleOAuthState: 'SearchConsoleOAuthState'
};

/**
 * This is a stub Prisma Client that will error at runtime if called.
 */
class PrismaClient {
  constructor() {
    return new Proxy(this, {
      get(target, prop) {
        let message
        const runtime = getRuntime()
        if (runtime.isEdge) {
          message = `PrismaClient is not configured to run in ${runtime.prettyName}. In order to run Prisma Client on edge runtime, either:
- Use Prisma Accelerate: https://pris.ly/d/accelerate
- Use Driver Adapters: https://pris.ly/d/driver-adapters
`;
        } else {
          message = 'PrismaClient is unable to run in this browser environment, or has been bundled for the browser (running in `' + runtime.prettyName + '`).'
        }
        
        message += `
If this is unexpected, please open an issue: https://pris.ly/prisma-prisma-bug-report`

        throw new Error(message)
      }
    })
  }
}

exports.PrismaClient = PrismaClient

Object.assign(exports, Prisma)
