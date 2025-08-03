import { Hono } from 'hono';
import { zValidator } from '@hono/zod-validator';
import { z } from 'zod';
import { getDb } from '../models/db';
import { userGroups, users } from '../models/schema';
import { AppBindings, JWTPayload } from '../types';
import { eq } from 'drizzle-orm';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const groupRoutes = new Hono<{ Bindings: AppBindings; Variables: { user?: JWTPayload } }>();

// Create group schema
const createGroupSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().optional(),
});

// Update group schema
const updateGroupSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().optional(),
});

// Add members to group schema
const addMembersSchema = z.object({
  userIds: z.array(z.string()).min(1),
});

// Apply auth middleware to all routes
groupRoutes.use('/*', authMiddleware);

// Get all groups (admin only)
groupRoutes.get('/all', adminMiddleware, async (c) => {
  const db = getDb(c.env.DB);

  try {
    const allGroups = await db.select({
      id: userGroups.id,
      name: userGroups.name,
      description: userGroups.description,
      createdById: userGroups.createdById,
      createdAt: userGroups.createdAt,
      updatedAt: userGroups.updatedAt,
    }).from(userGroups).all();

    // Calculate member count for each group
    const groupsWithMemberCount = await Promise.all(
      allGroups.map(async (group) => {
        const usersInGroup = await db.select({
          id: users.id,
          groupIDs: users.groupIDs,
        }).from(users).all();
        
        const memberCount = usersInGroup.filter(user => 
          (user.groupIDs as string[] || []).includes(group.id)
        ).length;

        return {
          ...group,
          memberCount
        };
      })
    );

    return c.json({ groups: groupsWithMemberCount });
  } catch (error) {
    console.error('Get all groups error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get groups with members (admin only)
groupRoutes.get('/with-members', adminMiddleware, async (c) => {
  const db = getDb(c.env.DB);

  try {
    const groups = await db.select({
      id: userGroups.id,
      name: userGroups.name,
      description: userGroups.description,
      createdById: userGroups.createdById,
      createdAt: userGroups.createdAt,
      updatedAt: userGroups.updatedAt,
    }).from(userGroups).all();

    const groupsWithMembers = await Promise.all(
      groups.map(async (group) => {
        const allUsers = await db.select({
          id: users.id,
          name: users.name,
          email: users.email,
          role: users.role,
          groupIDs: users.groupIDs,
        }).from(users).all();

        const members = allUsers.filter(user => 
          (user.groupIDs as string[] || []).includes(group.id)
        );

        return {
          ...group,
          members,
          memberCount: members.length
        };
      })
    );

    return c.json({ groups: groupsWithMembers });
  } catch (error) {
    console.error('Get groups with members error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Create group (admin only)
groupRoutes.post('/create', adminMiddleware, zValidator('json', createGroupSchema), async (c) => {
  const { name, description } = c.req.valid('json');
  const user = c.get('user')!;
  const db = getDb(c.env.DB);

  try {
    // Check if group with same name already exists
    const existingGroup = await db.select().from(userGroups).where(eq(userGroups.name, name)).get();
    if (existingGroup) {
      return c.json({ error: 'Group with this name already exists' }, 400);
    }

    const newGroup = await db.insert(userGroups).values({
      name,
      description,
      createdById: user.userId,
    }).returning().get();

    return c.json({
      message: 'Group created successfully',
      group: newGroup,
    });
  } catch (error) {
    console.error('Create group error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Update group (admin only)
groupRoutes.put('/:id', adminMiddleware, zValidator('json', updateGroupSchema), async (c) => {
  const groupId = c.req.param('id');
  const updateData = c.req.valid('json');
  const db = getDb(c.env.DB);

  try {
    // Check if group exists
    const existingGroup = await db.select().from(userGroups).where(eq(userGroups.id, groupId)).get();
    if (!existingGroup) {
      return c.json({ error: 'Group not found' }, 404);
    }

    // If name is being updated, check for conflicts
    if (updateData.name && updateData.name !== existingGroup.name) {
      const nameExists = await db.select().from(userGroups).where(eq(userGroups.name, updateData.name)).get();
      if (nameExists) {
        return c.json({ error: 'Group with this name already exists' }, 400);
      }
    }

    // Prepare update object
    const updateObject: any = {};
    if (updateData.name) updateObject.name = updateData.name;
    if (updateData.description !== undefined) updateObject.description = updateData.description;
    updateObject.updatedAt = Date.now();

    const updatedGroup = await db.update(userGroups)
      .set(updateObject)
      .where(eq(userGroups.id, groupId))
      .returning()
      .get();

    return c.json({
      message: 'Group updated successfully',
      group: updatedGroup,
    });
  } catch (error) {
    console.error('Update group error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Delete group (admin only)
groupRoutes.delete('/:id', adminMiddleware, async (c) => {
  const groupId = c.req.param('id');
  const db = getDb(c.env.DB);

  try {
    // Check if group exists
    const existingGroup = await db.select().from(userGroups).where(eq(userGroups.id, groupId)).get();
    if (!existingGroup) {
      return c.json({ error: 'Group not found' }, 404);
    }

    // Remove group from all users' groupIDs
    const allUsers = await db.select().from(users).all();
    for (const user of allUsers) {
      const currentGroupIDs = user.groupIDs as string[] || [];
      if (currentGroupIDs.includes(groupId)) {
        const updatedGroupIDs = currentGroupIDs.filter(id => id !== groupId);
        await db.update(users)
          .set({ groupIDs: updatedGroupIDs })
          .where(eq(users.id, user.id))
          .run();
      }
    }
    
    // Delete the group
    await db.delete(userGroups).where(eq(userGroups.id, groupId)).run();

    return c.json({ message: 'Group deleted successfully' });
  } catch (error) {
    console.error('Delete group error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Add members to group (admin only)
groupRoutes.post('/:id/members', adminMiddleware, zValidator('json', addMembersSchema), async (c) => {
  const groupId = c.req.param('id');
  const { userIds } = c.req.valid('json');
  const db = getDb(c.env.DB);

  try {
    // Check if group exists
    const existingGroup = await db.select().from(userGroups).where(eq(userGroups.id, groupId)).get();
    if (!existingGroup) {
      return c.json({ error: 'Group not found' }, 404);
    }

    // Check if all users exist
    const existingUsers = await db.select().from(users).where(eq(users.id, userIds[0])).all();
    if (existingUsers.length !== userIds.length) {
      return c.json({ error: 'One or more users not found' }, 400);
    }

    let addedCount = 0;
    for (const userId of userIds) {
      const user = await db.select().from(users).where(eq(users.id, userId)).get();
      if (user) {
        const currentGroupIDs = user.groupIDs as string[] || [];
        if (!currentGroupIDs.includes(groupId)) {
          const updatedGroupIDs = [...currentGroupIDs, groupId];
          await db.update(users)
            .set({ groupIDs: updatedGroupIDs })
            .where(eq(users.id, userId))
            .run();
          addedCount++;
        }
      }
    }

    if (addedCount === 0) {
      return c.json({ message: 'All users are already members of this group' });
    }

    return c.json({
      message: `${addedCount} users added to group successfully`,
      addedCount,
    });
  } catch (error) {
    console.error('Add members error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Remove members from group (admin only)
groupRoutes.delete('/:id/members', adminMiddleware, zValidator('json', addMembersSchema), async (c) => {
  const groupId = c.req.param('id');
  const { userIds } = c.req.valid('json');
  const db = getDb(c.env.DB);

  try {
    // Check if group exists
    const existingGroup = await db.select().from(userGroups).where(eq(userGroups.id, groupId)).get();
    if (!existingGroup) {
      return c.json({ error: 'Group not found' }, 404);
    }

    let removedCount = 0;
    for (const userId of userIds) {
      const user = await db.select().from(users).where(eq(users.id, userId)).get();
      if (user) {
        const currentGroupIDs = user.groupIDs as string[] || [];
        if (currentGroupIDs.includes(groupId)) {
          const updatedGroupIDs = currentGroupIDs.filter(id => id !== groupId);
          await db.update(users)
            .set({ groupIDs: updatedGroupIDs })
            .where(eq(users.id, userId))
            .run();
          removedCount++;
        }
      }
    }

    return c.json({
      message: `${removedCount} users removed from group successfully`,
      removedCount,
    });
  } catch (error) {
    console.error('Remove members error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Get users with their groups (admin only)
groupRoutes.get('/users-with-groups', adminMiddleware, async (c) => {
  const db = getDb(c.env.DB);

  try {
    const allUsers = await db.select({
      id: users.id,
      email: users.email,
      name: users.name,
      role: users.role,
      groupIDs: users.groupIDs,
      createdAt: users.createdAt,
    }).from(users).all();

    const allGroups = await db.select({
      id: userGroups.id,
      name: userGroups.name,
      description: userGroups.description,
    }).from(userGroups).all();

    const usersWithGroups = allUsers.map((user) => {
      const userGroupIDs = user.groupIDs as string[] || [];
      const userGroups = allGroups.filter(group => userGroupIDs.includes(group.id));

      return {
        ...user,
        groups: userGroups,
      };
    });

    return c.json({ users: usersWithGroups });
  } catch (error) {
    console.error('Get users with groups error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

export default groupRoutes; 