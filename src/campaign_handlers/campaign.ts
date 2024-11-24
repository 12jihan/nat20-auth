import { Pool } from "pg";

interface Campaign {
    dm_id: string;
    title: string;
    start_date: string;
    description: string;
    current_players: any[];
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
    const _pool = get_db_pool();

    const user_data: Campaign = {
        dm_id: "",
        title: "",
        start_date: "",
        description: "",
        current_players: [],
        date_created: new Date().toISOString(),
        date_modified: new Date().toISOString()
    };
    await add_camp_to_db(_pool, user_data);
}


// interface Campaign {
//     dm_id: string;
//     title: string;
//     start_date: string;
//     description: string;
//     current_players: any[];
//     date_created: string;
//     date_modified: string;
// }

async function add_camp_to_db(pool: Pool, user_data: Campaign) {
    // Setting up the postgres database
    const pool_obj = pool;
    const client = await pool_obj.connect();

    try {
        const _query = `INSERT INTO Nat20.users (
        dm_id,
        title,
        start_date,
        description,
        current_players,
        date_created,
        date_modified
        ) VALUES($1, $2, $3, $4, $5, $6, $6) RETURNING *`;

        const timestamp = new Date().toISOString();
        const _values = [
            user_data.dm_id,
            user_data.title,
            user_data.start_date,
            user_data.description,
            user_data.current_players,
            timestamp
        ];

        const _res = await client.query(_query, _values);
        return _res['rows'][0];

    } catch (error) {
        console.error("Database error:", error);
        if (error.code === '23505') {
            throw new Error("Database error when adding user");
        }
        throw error;
    } finally {
        client.release();
    }
}