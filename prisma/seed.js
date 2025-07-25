const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// Define categories data
const categoriesData = [
  {
    translations: [
      { language: "en", categoryName: "Mathematics" },
      { language: "ar", categoryName: "الرياضيات" },
    ],
  },
  {
    translations: [
      { language: "en", categoryName: "Physics" },
      { language: "ar", categoryName: "الفيزياء" },
    ],
  },
  {
    translations: [
      { language: "en", categoryName: "Chemistry" },
      { language: "ar", categoryName: "الكيمياء" },
    ],
  },
  {
    translations: [
      { language: "en", categoryName: "Biology" },
      { language: "ar", categoryName: "الأحياء" },
    ],
  },
  {
    translations: [
      { language: "en", categoryName: "Computer Science" },
      { language: "ar", categoryName: "علوم الحاسب" },
    ],
  },
  {
    translations: [
      { language: "en", categoryName: "Engineering" },
      { language: "ar", categoryName: "الهندسة" },
    ],
  },
  {
    translations: [
      { language: "en", categoryName: "English Language" },
      { language: "ar", categoryName: "اللغة الإنجليزية" },
    ],
  },
  {
    translations: [
      { language: "en", categoryName: "Arabic Language" },
      { language: "ar", categoryName: "اللغة العربية" },
    ],
  },
];

async function main() {
  try {
    console.log("🧹 Cleaning up existing data...");

    console.log("✅ Database cleared successfully");

    console.log("🌱 Seeding categories...");
    const categories = await Promise.all(
      categoriesData.map((categoryData) =>
        prisma.category.create({
          data: {
            translations: {
              create: categoryData.translations,
            },
          },
        })
      )
    );

    console.log(`✅ Created ${categories.length} categories`);
  } catch (error) {
    console.error("Error in database operations:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
