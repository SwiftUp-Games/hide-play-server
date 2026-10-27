import dotenv from 'dotenv';
dotenv.config();

import fs from 'fs';
import path from 'path';
import { MongoClient } from 'mongodb';

async function migrate() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'hide_and_play';

  console.log('================================================================');
  console.log('🍃 MIGRATING HIDE & PLAY DATA TO MONGODB ATLAS');
  console.log('================================================================');
  console.log('Database:', dbName);

  if (!uri) {
    console.error('❌ MONGODB_URI not found in environment.');
    process.exit(1);
  }

  const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB Atlas cluster.');
    const db = client.db(dbName);

    // Collections
    const configsCol = db.collection('game_configs');
    const feedbacksCol = db.collection('feedbacks');
    const analyticsCol = db.collection('analytics_events');
    const playersCol = db.collection('players');

    // Create Indexes
    await Promise.all([
      configsCol.createIndex({ key: 1 }, { unique: true }),
      playersCol.createIndex({ id: 1 }, { unique: true }),
      playersCol.createIndex({ master_uuid: 1 }, { sparse: true }),
      playersCol.createIndex({ last_active_at: -1 }),
      analyticsCol.createIndex({ id: 1 }, { unique: true }),
      analyticsCol.createIndex({ timestamp: -1 }),
      analyticsCol.createIndex({ event_name: 1, timestamp: -1 }),
      feedbacksCol.createIndex({ id: 1 }, { unique: true }),
      feedbacksCol.createIndex({ timestamp: -1 })
    ]);
    console.log('✅ Indexes verified.');

    // Read local store JSON
    const localJsonPath = path.resolve(__dirname, '../data/game_admin_store.json');
    if (fs.existsSync(localJsonPath)) {
      const raw = fs.readFileSync(localJsonPath, 'utf-8');
      const storeData = JSON.parse(raw);

      // 1. Migrate Configs
      if (storeData.pricing) {
        await configsCol.updateOne(
          { key: 'pricing' },
          { $set: { key: 'pricing', value: storeData.pricing, updated_at: Date.now() } },
          { upsert: true }
        );
        console.log('✅ Migrated pricing catalog to game_configs.');
      }

      if (storeData.monetization) {
        await configsCol.updateOne(
          { key: 'monetization' },
          { $set: { key: 'monetization', value: storeData.monetization, updated_at: Date.now() } },
          { upsert: true }
        );
        console.log('✅ Migrated monetization settings to game_configs.');
      }

      if (storeData.download_config) {
        await configsCol.updateOne(
          { key: 'download_config' },
          { $set: { key: 'download_config', value: storeData.download_config, updated_at: Date.now() } },
          { upsert: true }
        );
        console.log('✅ Migrated download config to game_configs.');
      }

      if (storeData.tester_analytics) {
        await configsCol.updateOne(
          { key: 'tester_analytics' },
          { $set: { key: 'tester_analytics', value: storeData.tester_analytics, updated_at: Date.now() } },
          { upsert: true }
        );
        console.log('✅ Migrated tester analytics metrics to game_configs.');
      }

      // 2. Migrate Tester Feedbacks
      if (Array.isArray(storeData.tester_feedbacks) && storeData.tester_feedbacks.length > 0) {
        for (const fb of storeData.tester_feedbacks) {
          await feedbacksCol.updateOne(
            { id: fb.id },
            { $set: fb },
            { upsert: true }
          );
        }
        console.log(`✅ Migrated ${storeData.tester_feedbacks.length} tester feedback submissions.`);
      }

      // 3. Migrate Analytics Events
      if (Array.isArray(storeData.analytics_events) && storeData.analytics_events.length > 0) {
        for (const evt of storeData.analytics_events) {
          await analyticsCol.updateOne(
            { id: evt.id },
            { $set: evt },
            { upsert: true }
          );
        }
        console.log(`✅ Migrated ${storeData.analytics_events.length} telemetry analytics events.`);
      }

      // 4. Migrate Players (if any in storeData)
      if (storeData.players && typeof storeData.players === 'object') {
        const pKeys = Object.keys(storeData.players);
        for (const pId of pKeys) {
          const player = storeData.players[pId];
          await playersCol.updateOne(
            { id: player.id },
            { $set: player },
            { upsert: true }
          );
        }
        if (pKeys.length > 0) {
          console.log(`✅ Migrated ${pKeys.length} players.`);
        }
      }
    }

    // 5. Ensure Starter / Seed Players Exist in Database
    const existingPlayerCount = await playersCol.countDocuments();
    if (existingPlayerCount === 0 || existingPlayerCount === 1) {
      const seedPlayers = [
        {
          id: 'ply_kuttan_001',
          master_uuid: 'ply_kuttan_001',
          name: 'Kuttan Menon',
          platform: 'android_pgs',
          avatar: 'boy_default',
          hat: 'hat_cap',
          dress: 'dress_mundu',
          coins: 1450,
          diamonds: 35,
          matches_played: 18,
          matches_won: 11,
          high_score: 520,
          unlocked_avatars: ['boy_default', 'police', 'traditional'],
          unlocked_hats: ['hat_none', 'hat_cap', 'hat_turban'],
          unlocked_dresses: ['dress_mundu', 'dress_jersey'],
          created_at: Date.now() - 86400000 * 3,
          last_active_at: Date.now() - 3600000 * 2
        },
        {
          id: 'ply_ammu_002',
          master_uuid: 'ply_ammu_002',
          name: 'Ammu Varma',
          platform: 'ios_gamecenter',
          avatar: 'girl_default',
          hat: 'hat_flower',
          dress: 'dress_sari',
          coins: 2100,
          diamonds: 50,
          matches_played: 24,
          matches_won: 16,
          high_score: 680,
          unlocked_avatars: ['girl_default', 'girl_artist'],
          unlocked_hats: ['hat_none', 'hat_flower', 'hat_crown'],
          unlocked_dresses: ['dress_mundu', 'dress_sari'],
          created_at: Date.now() - 86400000 * 2,
          last_active_at: Date.now() - 1800000
        },
        {
          id: 'ply_athul_003',
          master_uuid: 'ply_athul_003',
          name: 'Athul Krishna',
          platform: 'android_pgs',
          avatar: 'police',
          hat: 'hat_none',
          dress: 'dress_suit',
          coins: 890,
          diamonds: 20,
          matches_played: 9,
          matches_won: 5,
          high_score: 340,
          unlocked_avatars: ['boy_default', 'police'],
          unlocked_hats: ['hat_none'],
          unlocked_dresses: ['dress_mundu', 'dress_suit'],
          created_at: Date.now() - 86400000,
          last_active_at: Date.now() - 900000
        }
      ];

      for (const p of seedPlayers) {
        await playersCol.updateOne({ id: p.id }, { $set: p }, { upsert: true });
      }
      console.log(`✅ Seeded ${seedPlayers.length} starter player profiles in MongoDB.`);
    }

    // 6. Summary of Atlas Collections
    const totalPlayers = await playersCol.countDocuments();
    const totalAnalytics = await analyticsCol.countDocuments();
    const totalFeedbacks = await feedbacksCol.countDocuments();
    const totalConfigs = await configsCol.countDocuments();

    console.log('================================================================');
    console.log('📊 MONGODB ATLAS DATABASE HEALTH REPORT:');
    console.log(`- Players:          ${totalPlayers} documents`);
    console.log(`- Analytics Events: ${totalAnalytics} documents`);
    console.log(`- Feedbacks:        ${totalFeedbacks} documents`);
    console.log(`- Game Configs:     ${totalConfigs} documents`);
    console.log('================================================================');
    console.log('🎉 MIGRATION COMPLETED SUCCESSFULLY!');
  } catch (err) {
    console.error('❌ Migration failed:', err);
    process.exit(1);
  } finally {
    await client.close();
  }
}

migrate();
