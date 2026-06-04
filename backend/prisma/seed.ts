import { PrismaClient, Role, Frequency } from '@prisma/client';
import * as argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const adminUsername = process.env.SEED_ADMIN_USERNAME ?? 'admin';
  const adminPassword = process.env.SEED_ADMIN_PASSWORD ?? 'Admin@123!';
  const supervisorUsername = process.env.SEED_SUPERVISOR_USERNAME ?? 'supervisor';
  const supervisorPassword = process.env.SEED_SUPERVISOR_PASSWORD ?? 'Super@123!';

  const adminHash = await argon2.hash(adminPassword);
  const supervisorHash = await argon2.hash(supervisorPassword);

  await prisma.user.upsert({
    where: { username: adminUsername },
    update: {},
    create: {
      fullName: 'Admin User',
      username: adminUsername,
      passwordHash: adminHash,
      role: Role.admin,
      mustResetPw: true,
    },
  });

  await prisma.user.upsert({
    where: { username: supervisorUsername },
    update: {},
    create: {
      fullName: 'Field Supervisor',
      username: supervisorUsername,
      passwordHash: supervisorHash,
      role: Role.supervisor,
      mustResetPw: true,
    },
  });

  type ItemDef = { title: string; frequency: Frequency; requiresPhoto?: boolean };
  const categories: Array<{ name: string; sortOrder: number; items: ItemDef[] }> = [
    {
      name: 'Solar & Rooftop',
      sortOrder: 1,
      items: [
        { title: 'Solar Panels Clean / Tanks Leakage – Check', frequency: Frequency.daily },
        { title: 'Solar Lights Daily ON – Check', frequency: Frequency.daily },
        { title: 'Rain Sheets Leakage & Damage – Check', frequency: Frequency.daily },
        { title: 'Rain Water Filter Clean / Working', frequency: Frequency.weekly },
      ],
    },
    {
      name: 'Building & Common Areas',
      sortOrder: 2,
      items: [
        { title: 'Chair / Table / Lighting – Check', frequency: Frequency.daily },
        { title: 'After-Party Cleaning Complete', frequency: Frequency.daily },
        { title: 'Door / Windows – Smooth Open/Close', frequency: Frequency.daily },
        { title: 'Floors, Stairs & Roof Cleaning – All Floors', frequency: Frequency.daily },
        { title: 'Walls / Pillars Damage – Check', frequency: Frequency.weekly },
        { title: 'Painting Touch-up – Check', frequency: Frequency.monthly },
        { title: 'Parking Lot / Roof – Cleaning', frequency: Frequency.daily },
        { title: 'Garbage Pickup / On-time Clearance', frequency: Frequency.daily },
      ],
    },
    {
      name: 'Gym & Amenities',
      sortOrder: 3,
      items: [
        { title: 'All Gym Equipment – Working', frequency: Frequency.daily },
        { title: 'Gym Equipment & Floor Cleaning', frequency: Frequency.daily },
        { title: 'Child Play Area Equipment – Check', frequency: Frequency.daily },
        { title: 'Plant Watering / Water Storage – Check', frequency: Frequency.daily },
      ],
    },
    {
      name: 'Security & Surveillance',
      sortOrder: 4,
      items: [
        { title: 'CCTV DVR Working – All Lights ON', frequency: Frequency.daily },
        { title: 'Internet Connection to CCTV', frequency: Frequency.daily },
        { title: 'Lift CCTV Working / Damages – Check', frequency: Frequency.daily },
        { title: 'Internal & Front Gate Parking – No Issues', frequency: Frequency.daily },
        { title: 'Security Guard Fire-Equipment Training', frequency: Frequency.weekly },
      ],
    },
    {
      name: 'Electrical & Power',
      sortOrder: 5,
      items: [
        { title: 'Power Backup ON', frequency: Frequency.daily },
        { title: 'All Switches Working', frequency: Frequency.daily },
        { title: 'No Loose Wires', frequency: Frequency.daily },
        { title: 'All Floors – LED Bulbs Working', frequency: Frequency.daily },
        { title: 'Electrical Panels – Check', frequency: Frequency.daily },
        { title: 'Genset Diesel / Working / Damages – Check', frequency: Frequency.daily },
        { title: 'BESCOM Power Supply', frequency: Frequency.daily },
      ],
    },
    {
      name: 'Plumbing & Water',
      sortOrder: 6,
      items: [
        { title: 'Wall Pipe Connections Leakage – Check', frequency: Frequency.daily },
        { title: 'Water Tanks / Sump Cleaning – Check', frequency: Frequency.weekly },
        { title: 'Water Softener – SALT / Service / TDS – Check', frequency: Frequency.daily },
        { title: 'Borewell & Sump Motor Working', frequency: Frequency.daily },
        { title: 'Drainage Pipes Leak – Check', frequency: Frequency.daily },
      ],
    },
    {
      name: 'Safety',
      sortOrder: 7,
      items: [
        {
          title: 'Fire Extinguisher Physical / Liquid – Check',
          frequency: Frequency.daily,
          requiresPhoto: true,
        },
      ],
    },
    {
      name: 'Pest Control',
      sortOrder: 8,
      items: [{ title: 'Pigeons Net Gaps – Check', frequency: Frequency.daily }],
    },
  ];

  for (const cat of categories) {
    let category = await prisma.checklistCategory.findFirst({ where: { name: cat.name } });
    if (!category) {
      category = await prisma.checklistCategory.create({
        data: { name: cat.name, sortOrder: cat.sortOrder },
      });
    }

    for (let i = 0; i < cat.items.length; i++) {
      const item = cat.items[i];
      const existing = await prisma.checklistItem.findFirst({
        where: { categoryId: category.id, title: item.title },
      });
      if (!existing) {
        await prisma.checklistItem.create({
          data: {
            categoryId: category.id,
            title: item.title,
            frequency: item.frequency,
            requiresPhoto: item.requiresPhoto ?? false,
            sortOrder: i + 1,
          },
        });
      }
    }
  }

  console.log('Seed complete.');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
