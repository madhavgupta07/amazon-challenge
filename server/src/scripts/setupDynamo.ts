import {
  CreateTableCommand,
  DescribeTableCommand,
  DynamoDBClient,
  ResourceInUseException,
  UpdateTimeToLiveCommand,
} from "@aws-sdk/client-dynamodb";
import { env } from "../config/env.js";
import { logger } from "../utils/logger.js";

/**
 * Create the pending-actions table (if missing) and enable TTL on `expiresAt`.
 *
 * Usage (reads the same AWS_* / DYNAMODB_* env as the server):
 *   npm run dynamo:setup -w server
 *
 * For DynamoDB Local, set DYNAMODB_ENDPOINT=http://localhost:8000 first.
 */
async function main(): Promise<void> {
  const table = env.aws.pendingActionsTable;
  const client = new DynamoDBClient({
    ...(env.aws.region ? { region: env.aws.region } : {}),
    ...(env.aws.dynamoEndpoint ? { endpoint: env.aws.dynamoEndpoint } : {}),
  });

  const exists = await tableExists(client, table);
  if (exists) {
    logger.info("dynamodb.table_exists", { table });
  } else {
    logger.info("dynamodb.creating_table", { table });
    try {
      await client.send(
        new CreateTableCommand({
          TableName: table,
          // Provisioned mode is required for the DynamoDB always-free allowance
          // (25 WCU / 25 RCU + 25 GB, permanent and available on every account).
          BillingMode: "PROVISIONED",
          ProvisionedThroughput: { ReadCapacityUnits: 25, WriteCapacityUnits: 25 },
          AttributeDefinitions: [{ AttributeName: "id", AttributeType: "S" }],
          KeySchema: [{ AttributeName: "id", KeyType: "HASH" }],
          TableClass: "STANDARD",
        }),
      );
      await waitUntilActive(client, table);
      logger.info("dynamodb.table_created", { table });
    } catch (error) {
      if (!(error instanceof ResourceInUseException)) throw error;
      logger.info("dynamodb.table_exists", { table });
    }
  }

  await enableTtl(client, table);
  logger.info("dynamodb.ttl_enabled", { table, attribute: "expiresAt" });
}

async function tableExists(client: DynamoDBClient, table: string): Promise<boolean> {
  try {
    await client.send(new DescribeTableCommand({ TableName: table }));
    return true;
  } catch {
    return false;
  }
}

async function waitUntilActive(client: DynamoDBClient, table: string): Promise<void> {
  for (let attempt = 0; attempt < 20; attempt += 1) {
    const { Table } = await client.send(new DescribeTableCommand({ TableName: table }));
    if (Table?.TableStatus === "ACTIVE") return;
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }
}

async function enableTtl(client: DynamoDBClient, table: string): Promise<void> {
  try {
    await client.send(
      new UpdateTimeToLiveCommand({
        TableName: table,
        TimeToLiveSpecification: { AttributeName: "expiresAt", Enabled: true },
      }),
    );
  } catch (error) {
    logger.warn("dynamodb.ttl_enable_failed", { message: (error as Error).message });
  }
}

main().catch((error) => {
  logger.error("dynamodb.setup_failed", { message: (error as Error).message });
  process.exit(1);
});
