import { Client, Pool, PoolClient, QueryResult } from "pg";

interface Campaign {
    dm_id: string;
    title: string;
    start_date: string;
    description: string;
    current_players: any[];
    private_campaign: boolean;
    date_created: string;
    date_modified: string;
}

const get_db_pool = () => new Pool({
    user: process.env.DB_USER,
    host: process.env.DB_HOST,
    database: process.env.DB_NAME,
    password: process.env.DB_PASSWORD,
    port: Number(process.env.DB_PORT),
    ssl: {
        rejectUnauthorized: false
    }
});

export const create_campaign = async (event) => {
    const campaign_data = JSON.parse(event.body);
    const _pool = get_db_pool();

    try {
        const user_data: Campaign = {
            dm_id: campaign_data.dm_id,
            title: campaign_data.title,
            start_date: campaign_data.start_date,
            description: campaign_data.description,
            current_players: [
                campaign_data.dm_id,
                campaign_data.dm_id,
                campaign_data.dm_id
            ],
            private_campaign: campaign_data.private_campaign,
            date_created: new Date().toISOString(),
            date_modified: new Date().toISOString()
        };
        await add_campaign_to_db(_pool, user_data);

        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, PUT, GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "success",
                data: user_data
            })
        };
    } catch (error) {
        await _pool.end()
    }
}

export const get_campaigns = async (event) => {
    const _req = event.queryStringParameters;
    const dm_id = _req.dm_id;
    console.log("req:", dm_id);
    const _pool: Pool = get_db_pool();

    try {
        const _res: QueryResult<any> | undefined = await get_campaigns_by_dm_id(_pool, dm_id);
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, PUT, GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "success",
                data: _res?.rows
            })
        };
    } catch (error) {
        console.log("can not get campaign");
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, PUT, GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "failure",
                data: error
            })
        };
    } finally {
        await _pool.end()
    }
}

export const get_campaign = async (event) => {
    const _id = event.pathParameters.id;
    console.log("id:", _id);
    const _pool: Pool = get_db_pool();

    try {
        const _res: QueryResult<any> | undefined = await get_campaign_by_id(_pool, _id);
        return {
            statusCode: 200,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, PUT, GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "success",
                data: _res?.rows
            })
        };
    } catch (error) {
        console.log("can not get campaign");
        return {
            statusCode: 500,
            headers: {
                "Access-Control-Allow-Origin": "*",
                "Access-Control-Allow-Methods": "POST, PUT, GET, OPTIONS",
                "Access-Control-Allow-Headers": "Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token",
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: "failure",
                data: error
            })
        };
    } finally {
        await _pool.end()
    }
}

async function add_campaign_to_db(pool: Pool, user_data: Campaign) {
    // Setting up the postgres database
    const pool_obj = pool;
    const client = await pool_obj.connect();
    console.log("client", client);
    console.log("campaign data:", user_data);

    try {
        const _query = `INSERT INTO Nat20.campaigns (
        dm_id,
        title,
        start_date,
        description,
        current_players,
        private_campaign,
        date_created,
        date_modified
        ) VALUES($1, $2, $3, $4, $5, $6, $7, $7) RETURNING *`;

        const timestamp = new Date().toISOString();
        const _values = [
            user_data.dm_id,
            user_data.title,
            user_data.start_date,
            user_data.description,
            user_data.current_players,
            user_data.private_campaign,
            timestamp
        ];

        const _res = await client.query(_query, _values);
        return _res['rows'][0];

    } catch (error) {
        console.error("Database error:", error);
        if (error.code === '42601') {
            throw new Error("Database error when adding user");
        }
        throw error;
    } finally {
        client.release();
    }
}

async function get_campaigns_by_dm_id(pool: Pool, dm_id: string) {
    const pool_obj: Pool = pool;
    const _client: PoolClient = await pool_obj.connect();

    const _query = `
        SELECT * FROM Nat20.campaigns 
        WHERE dm_id = $1 
        ORDER BY date_created 
        DESC LIMIT 10
    `;
    const values = [dm_id];

    try {
        const _res = await _client.query(_query, values);
        return _res;
    } catch (error) {
        console.log("there was an error running a query:", _query, error)
    } finally {
        _client.release();
    }
}

async function get_campaign_by_id(pool: Pool, id: string) {
    const pool_obj: Pool = pool;
    const _client: PoolClient = await pool_obj.connect();
    console.log("id___:", id);
    const _query = `SELECT * FROM Nat20.campaigns WHERE id = $1`;
    const values = [id];

    try {
        const _res = await _client.query(_query, values);
        console.log('_res:', _res);
        return _res;
    } catch (error) {
        console.log("there was an error running a query:", _query, error)
    } finally {
        _client.release();
    }
}

// will flesh this out a bit later to help with making db calls simpler
async function db_call() {

}