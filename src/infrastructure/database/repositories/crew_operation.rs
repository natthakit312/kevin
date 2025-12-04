use anyhow::{Ok, Result};
use async_trait::async_trait;
use diesel::{
    ExpressionMethods, PgConnection, RunQueryDsl,
    dsl::delete,
    insert_into,
    r2d2::{ConnectionManager, PooledConnection},
};
use std::sync::Arc;

use crate::{
    domain::{
        entities::crew_memberships::CrewMemberShips,
        repositories::crew_operation::CrewParticipationRepository,
    },
    infrastructure::database::{postgresql_connection::PgPoolSquad, schema::crew_memberships},
};

pub struct CrewParticipationPostgres {
    db_pool: Arc<PgPoolSquad>,
}

impl CrewParticipationPostgres {
    pub fn new(db_pool: Arc<PgPoolSquad>) -> Self {
        Self { db_pool }
    }
}

#[async_trait]
impl CrewParticipationRepository for CrewParticipationPostgres {
    async fn join(&self, crew_member_ships: CrewMemberShips) -> Result<()> {
        let mut conn = Arc::clone(&self.db_pool).get()?;
        insert_into(crew_memberships::table)
            .values(crew_member_ships)
            .execute(&mut conn)?;
        Ok(())
    }

    async fn leave(&self, crew_member_ships: CrewMemberShips) -> Result<()> {
        let mut conn = Arc::clone(&self.db_pool).get()?;
        delete(crew_memberships::table)
            .filter(crew_memberships::brawler_id.eq(crew_member_ships.brawler_id))
            .filter(crew_memberships::mission_id.eq(crew_member_ships.mission_id))
            .execute(&mut conn)?;
        Ok(())
    }

    fn for_insert_transaction_test(
        &self,
        conn: &mut PooledConnection<ConnectionManager<PgConnection>>,
        crew_member_ships: CrewMemberShips,
    ) -> Result<()> {
        insert_into(crew_memberships::table)
            .values(crew_member_ships)
            .execute(conn)?;
        Ok(())
    }

    fn for_delete_transaction_test(
        &self,
        conn: &mut PooledConnection<ConnectionManager<PgConnection>>,
        crew_member_ships: CrewMemberShips,
    ) -> Result<()> {
        delete(crew_memberships::table)
            .filter(crew_memberships::brawler_id.eq(crew_member_ships.brawler_id))
            .filter(crew_memberships::mission_id.eq(crew_member_ships.mission_id))
            .execute(conn)?;
        Ok(())
    }
}
