
import { mockGlobal, mockInstanceOf } from 'screeps-jest';
import { unwrappedLoop } from './main';

describe('spawning logic', () => {
    let spawn: StructureSpawn;
    let room: Room & { energyAvailable?: number; energyCapacityAvailable?: number };
    let source1: Source, source2: Source;
    let site1: ConstructionSite, site2: ConstructionSite, site3: ConstructionSite, site4: ConstructionSite, site5: ConstructionSite, site6: ConstructionSite;

    let tower: StructureTower;
    beforeEach(() => {
        spawn = mockInstanceOf<StructureSpawn>({ spawning: null, spawnCreep: jest.fn(() => OK), pos: { x: 0, y: 0, roomName: 'W1N1' } });
        source1 = mockInstanceOf<Source>({ id: 'source1' });
        source2 = mockInstanceOf<Source>({ id: 'source2' });
        site1 = mockInstanceOf<ConstructionSite>({ id: 'site1' });
        site2 = mockInstanceOf<ConstructionSite>({ id: 'site2' });
        site3 = mockInstanceOf<ConstructionSite>({ id: 'site3' });
        site4 = mockInstanceOf<ConstructionSite>({ id: 'site4' });
        site5 = mockInstanceOf<ConstructionSite>({ id: 'site5' });
        site6 = mockInstanceOf<ConstructionSite>({ id: 'site6' });
        tower = mockInstanceOf<StructureTower>({ pos: { x: 0, y: 0, roomName: 'W1N1', findClosestByRange: jest.fn() } });
        room = mockInstanceOf<Room>({
            name: 'W1N1',
            controller: { my: true } as StructureController,
            find: jest.fn(),
            energyAvailable: 200,
            energyCapacityAvailable: 200
        }) as Room & { energyAvailable?: number; energyCapacityAvailable?: number };
        (room.find as jest.Mock).mockImplementation((type: number, opts?: any) => {
            if (type === FIND_MY_STRUCTURES && opts && opts.filter && opts.filter.structureType === STRUCTURE_TOWER) return [tower];
            if (type === FIND_MY_STRUCTURES) return [spawn];
            if (type === FIND_SOURCES) return [source1, source2];
            if (type === FIND_CONSTRUCTION_SITES) return [site1, site2, site3, site4, site5, site6];
            return [];
        });
    });

    it('spawns one harvester per energy source', () => {
        room.energyAvailable = 200;
        room.energyCapacityAvailable = 200;
        mockGlobal<Game>('Game', {
            creeps: {},
            rooms: { W1N1: room },
            time: 1
        });
        mockGlobal<Memory>('Memory', { creeps: {} });
        unwrappedLoop();
        expect(spawn.spawnCreep).toHaveBeenCalledWith(
            [WORK, CARRY, MOVE],
            expect.stringContaining('harvester-'),
            expect.objectContaining({ memory: expect.objectContaining({ role: 'harvester' }) })
        );
    });

    it('spawns an upgrader only if energy is at least 50% full', () => {
        room.energyAvailable = 150;
        room.energyCapacityAvailable = 200;
        mockGlobal<Game>('Game', {
            creeps: {},
            rooms: { W1N1: room },
            time: 2
        });
        mockGlobal<Memory>('Memory', { creeps: {} });
        unwrappedLoop();
        expect(spawn.spawnCreep).toHaveBeenCalledWith(
            [WORK, CARRY, MOVE],
            expect.stringContaining('upgrader-'),
            expect.objectContaining({ memory: expect.objectContaining({ role: 'upgrader' }) })
        );
    });

    it('does not spawn an upgrader if energy is less than 50% full', () => {
        room.energyAvailable = 90;
        room.energyCapacityAvailable = 200;
        mockGlobal<Game>('Game', {
            creeps: {},
            rooms: { W1N1: room },
            time: 3
        });
        mockGlobal<Memory>('Memory', { creeps: {} });
        unwrappedLoop();
        expect(spawn.spawnCreep).not.toHaveBeenCalledWith(
            [WORK, CARRY, MOVE],
            expect.stringContaining('upgrader-'),
            expect.anything()
        );
    });

    it('spawns one builder per 5 construction sites', () => {
        room.energyAvailable = 200;
        room.energyCapacityAvailable = 200;
        mockGlobal<Game>('Game', {
            creeps: {},
            rooms: { W1N1: room },
            time: 4
        });
        mockGlobal<Memory>('Memory', { creeps: {} });
        unwrappedLoop();
        expect(spawn.spawnCreep).toHaveBeenCalledWith(
            [WORK, CARRY, MOVE],
            expect.stringContaining('builder-'),
            expect.objectContaining({ memory: expect.objectContaining({ role: 'builder' }) })
        );
    });

    it('does not spawn a builder if there are no construction sites', () => {
        (room.find as jest.Mock).mockImplementation((type: number, opts?: any) => {
            if (type === FIND_MY_STRUCTURES && opts && opts.filter && opts.filter.structureType === STRUCTURE_TOWER) return [tower];
            if (type === FIND_MY_STRUCTURES) return [spawn];
            if (type === FIND_SOURCES) return [source1, source2];
            if (type === FIND_CONSTRUCTION_SITES) return [];
            return [];
        });
        room.energyAvailable = 200;
        room.energyCapacityAvailable = 200;
        mockGlobal<Game>('Game', {
            creeps: {},
            rooms: { W1N1: room },
            time: 5
        });
        mockGlobal<Memory>('Memory', { creeps: {} });
        unwrappedLoop();
        expect(spawn.spawnCreep).not.toHaveBeenCalledWith(
            [WORK, CARRY, MOVE],
            expect.stringContaining('builder-'),
            expect.anything()
        );
    });
});
