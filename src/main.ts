import roleBuilder, { Builder } from 'roles/builder';
import roleHarvester from 'roles/harvester';
import roleUpgrader, { Upgrader } from 'roles/upgrader';
import ErrorMapper from 'utils/ErrorMapper';
import { runTower } from './tower';

declare global {
  interface CreepMemory {
    role: string;
    working: boolean;
    room: string;
  }
}

function unwrappedLoop(): void {
  console.log(`Current game tick is ${Game.time}`);

  Object.values(Game.rooms).forEach(room => {
    if (room.controller?.my) {
      const towers = room.find<StructureTower>(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_TOWER } });
      towers.forEach(tower => {
        runTower(tower);
      });

      // --- SPAWNING LOGIC ---
      const spawns: StructureSpawn[] = room.find(FIND_MY_STRUCTURES, { filter: { structureType: STRUCTURE_SPAWN } });
      if (spawns.length > 0) {
        const spawn = spawns[0];

        // 1. Harvesters: 1 per energy source
        const sources = room.find(FIND_SOURCES);
        const harvesters = Object.values(Game.creeps).filter(c => c.memory.role === 'harvester' && c.memory.room === room.name);
        if (harvesters.length < sources.length) {
          if (!spawn.spawning) {
            spawn.spawnCreep([WORK, CARRY, MOVE], `harvester-${Game.time}`, { memory: { role: 'harvester', working: false, room: room.name } });
          }
        }

        // 2. Upgraders: only if at least 50% energy available
        const upgraders = Object.values(Game.creeps).filter(c => c.memory.role === 'upgrader' && c.memory.room === room.name);
        const energyAvailable = (room as any).energyAvailable ?? 0;
        const energyCapacity = (room as any).energyCapacityAvailable ?? 0;
        if (energyAvailable >= energyCapacity / 2) {
          if (upgraders.length < 1 && !spawn.spawning) {
            spawn.spawnCreep([WORK, CARRY, MOVE], `upgrader-${Game.time}`, { memory: { role: 'upgrader', working: false, room: room.name } });
          }
        }

        // 3. Builders: only if there are construction sites, 1 per 5 sites
        const sites = room.find(FIND_CONSTRUCTION_SITES);
        const builders = Object.values(Game.creeps).filter(c => c.memory.role === 'builder' && c.memory.room === room.name);
        const numBuildersNeeded = Math.floor(sites.length / 5);
        if (numBuildersNeeded > 0 && builders.length < numBuildersNeeded && !spawn.spawning) {
          spawn.spawnCreep([WORK, CARRY, MOVE], `builder-${Game.time}`, { memory: { role: 'builder', working: false, room: room.name } });
        }
      }
      // --- END SPAWNING LOGIC ---
    }
  });

  Object.values(Game.creeps).forEach(creep => {
    if (creep.memory.role === 'harvester') {
      roleHarvester.run(creep);
    }
    if (creep.memory.role === 'upgrader') {
      roleUpgrader.run(creep as Upgrader);
    }
    if (creep.memory.role === 'builder') {
      roleBuilder.run(creep as Builder);
    }
  });

  // Automatically delete memory of missing creeps
  Object.keys(Memory.creeps)
    .filter(name => !(name in Game.creeps))
    .forEach(name => delete Memory.creeps[name]);
}

// When compiling TS to JS and bundling with rollup, the line numbers and file names in error messages change
// This utility uses source maps to get the line numbers and file names of the original, TS source code
const loop = ErrorMapper.wrapLoop(unwrappedLoop);

export {
  loop,
  unwrappedLoop
};
