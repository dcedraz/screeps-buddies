import { mockGlobal, mockInstanceOf, mockStructure } from 'screeps-jest';
import { unwrappedLoop } from './main';
import roleBuilder from './roles/builder';
import roleHarvester from './roles/harvester';
import roleUpgrader from './roles/upgrader';
import { runTower } from './tower';

jest.mock('roles/builder');
jest.mock('roles/harvester');
jest.mock('roles/upgrader');
jest.mock('tower');

const builder = mockInstanceOf<Creep>({ memory: { role: 'builder' } });
const harvester = mockInstanceOf<Creep>({ memory: { role: 'harvester' } });
const upgrader = mockInstanceOf<Creep>({ memory: { role: 'upgrader' } });

const myController = mockInstanceOf<StructureController>({ my: true });
const someoneElsesController = mockInstanceOf<StructureController>({ my: false });
const tower1 = mockStructure(STRUCTURE_TOWER, { spawning: null });
const tower2 = mockStructure(STRUCTURE_TOWER, { spawning: null });
const myRoomWithTowers = mockInstanceOf<Room>({
  controller: myController,
  name: 'W1N1',
  energyAvailable: 300,
  energyCapacityAvailable: 300,
  find: (type: number, opts?: any) => {
    if (type === FIND_MY_STRUCTURES && opts && opts.filter && opts.filter.structureType === STRUCTURE_TOWER) return [tower1, tower2];
    if (type === FIND_MY_STRUCTURES && opts && opts.filter && opts.filter.structureType === STRUCTURE_SPAWN) return [{ spawning: null, spawnCreep: jest.fn() }];
    return [];
  }
});
const myRoomWithoutTowers = mockInstanceOf<Room>({
  controller: myController,
  find: () => []
});
const someoneElsesRoom = mockInstanceOf<Room>({ controller: someoneElsesController });
const noOnesRoom = mockInstanceOf<Room>({ controller: undefined });

describe('main loop', () => {

  it('runs every creep', () => {
    mockGlobal<Game>('Game', {
      creeps: {
        builder,
        harvester,
        upgrader
      },
      rooms: {},
      time: 1
    });
    mockGlobal<Memory>('Memory', { creeps: {} });
    unwrappedLoop();
    expect(roleBuilder.run).toHaveBeenCalledWith(builder);
    expect(roleHarvester.run).toHaveBeenCalledWith(harvester);
    expect(roleUpgrader.run).toHaveBeenCalledWith(upgrader);
  });

  it('cleans up the memory from deceased creeps', () => {
    mockGlobal<Game>('Game', {
      creeps: { stillKicking: harvester },
      rooms: {},
      time: 1
    });
    mockGlobal<Memory>('Memory', {
      creeps: {
        dead: { role: 'garbage' },
        goner: { role: 'waste' },
        stillKicking: harvester.memory
      }
    });
    unwrappedLoop();
    expect(Memory.creeps).toEqual({ stillKicking: harvester.memory });
  });

  it('runs every tower in my rooms', () => {
    mockGlobal<Game>('Game', {
      creeps: {},
      rooms: {
        myRoomWithTowers,
        myRoomWithoutTowers,
        noOnesRoom,
        someoneElsesRoom
      },
      time: 1
    });
    mockGlobal<Memory>('Memory', { creeps: {} });
    unwrappedLoop();
    expect(runTower).toHaveBeenCalledWith(tower1);
    expect(runTower).toHaveBeenCalledWith(tower2);
  });

});
