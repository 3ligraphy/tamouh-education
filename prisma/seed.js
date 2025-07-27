const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
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

// Define super admin data
const superAdminData = {
  name: "Super Admin",
  email: "admin@tamouh-education.com",
  phone: "+966123456789",
  password: "SuperAdmin123!", // This will be hashed
  role: "ADMIN",
  studentType: "UNIVERSITY_STUDENT", // Add studentType for admin
  accountStatus: "ACTIVE",
  emailVerified: new Date(),
};

// Define sample users data
const usersData = [
  {
    name: "Ahmed Al-Rashid",
    email: "ahmed.rashid@email.com",
    phone: "+966123456701",
    password: "password123",
    role: "USER",
    studentType: "UNIVERSITY_STUDENT",
  },
  {
    name: "Fatima Al-Zahra",
    email: "fatima.zahra@email.com",
    phone: "+966123456702",
    password: "password123",
    role: "USER",
    studentType: "SCHOOL_STUDENT",
  },
  {
    name: "Mohammed bin Salem",
    email: "mohammed.salem@email.com",
    phone: "+966123456703",
    password: "password123",
    role: "USER",
    studentType: "UNIVERSITY_STUDENT",
  },
  {
    name: "Aisha Al-Mutairi",
    email: "aisha.mutairi@email.com",
    phone: "+966123456704",
    password: "password123",
    role: "USER",
    studentType: "SCHOOL_STUDENT",
  },
  {
    name: "Khalid Al-Otaibi",
    email: "khalid.otaibi@email.com",
    phone: "+966123456705",
    password: "password123",
    role: "USER",
    studentType: "UNIVERSITY_STUDENT",
  },
];

// Define instructors data
const instructorsData = [
  {
    name: "Dr. Abdullah Al-Sabah",
    email: "abdullah.sabah@tamouh.com",
    phone: "+966123456801",
    password: "instructor123",
    role: "INSTRUCTOR",
    bio: {
      en: "Professor of Mathematics with 15 years of experience in teaching calculus and algebra.",
      ar: "أستاذ الرياضيات مع 15 عامًا من الخبرة في تدريس التفاضل والتكامل والجبر.",
    },
    jobTitle: {
      en: "Mathematics Professor",
      ar: "أستاذ الرياضيات",
    },
    address: "Riyadh, Saudi Arabia",
  },
  {
    name: "Dr. Noura Al-Mansouri",
    email: "noura.mansouri@tamouh.com",
    phone: "+966123456802",
    password: "instructor123",
    role: "INSTRUCTOR",
    bio: {
      en: "Physics researcher and educator specializing in quantum mechanics and thermodynamics.",
      ar: "باحثة ومعلمة في الفيزياء متخصصة في ميكانيكا الكم والديناميكا الحرارية.",
    },
    jobTitle: {
      en: "Physics Professor",
      ar: "أستاذة الفيزياء",
    },
    address: "Jeddah, Saudi Arabia",
  },
  {
    name: "Dr. Omar Al-Harbi",
    email: "omar.harbi@tamouh.com",
    phone: "+966123456803",
    password: "instructor123",
    role: "INSTRUCTOR",
    bio: {
      en: "Computer Science expert with focus on artificial intelligence and machine learning.",
      ar: "خبير في علوم الحاسب مع التركيز على الذكاء الاصطناعي والتعلم الآلي.",
    },
    jobTitle: {
      en: "Computer Science Professor",
      ar: "أستاذ علوم الحاسب",
    },
    address: "Dammam, Saudi Arabia",
  },
];

// Define specialists data
const specialistsData = [
  {
    name: {
      en: "Dr. Sarah Al-Qahtani",
      ar: "د. سارة القحطاني",
    },
    title: {
      en: "Educational Technology Specialist",
      ar: "أخصائية تكنولوجيا التعليم",
    },
    image: "/logo.svg",
    order: 1,
  },
  {
    name: {
      en: "Prof. Ali Al-Dosari",
      ar: "أ.د. علي الدوسري",
    },
    title: {
      en: "Curriculum Development Expert",
      ar: "خبير تطوير المناهج",
    },
    image: "/logo.svg",
    order: 2,
  },
];

async function main() {
  try {
    console.log("🧹 Cleaning up existing data...");
    // Clear existing data in correct order due to foreign key constraints
    await prisma.courseTransaction.deleteMany({});
    await prisma.walletTransaction.deleteMany({});
    await prisma.review.deleteMany({});
    await prisma.userFavorite.deleteMany({});
    await prisma.courseProgress.deleteMany({});
    await prisma.lesson.deleteMany({});
    await prisma.unit.deleteMany({});
    await prisma.coursePermission.deleteMany({});
    await prisma.translation.deleteMany({});
    await prisma.course.deleteMany({});
    await prisma.instructorPermission.deleteMany({});
    await prisma.instructor.deleteMany({});
    await prisma.specialist.deleteMany({});
    await prisma.category.deleteMany({});
    await prisma.wallet.deleteMany({});
    await prisma.activeSession.deleteMany({});
    await prisma.session.deleteMany({});
    await prisma.account.deleteMany({});
    await prisma.user.deleteMany({});
    console.log("✅ Database cleared successfully");

    console.log("👨‍💼 Creating super admin user...");
    const hashedAdminPassword = await bcrypt.hash(superAdminData.password, 12);
    
    const superAdmin = await prisma.user.create({
      data: {
        name: superAdminData.name,
        email: superAdminData.email,
        phone: superAdminData.phone,
        password: hashedAdminPassword,
        role: superAdminData.role,
        studentType: superAdminData.studentType,
        accountStatus: superAdminData.accountStatus,
        emailVerified: superAdminData.emailVerified,
        wallet: {
          create: {
            balance: 1000.0,
          },
        },
      },
    });
    console.log(`✅ Created super admin: ${superAdmin.email}`);

    console.log("👥 Creating sample users...");
    const users = [];
    for (const userData of usersData) {
      const hashedPassword = await bcrypt.hash(userData.password, 12);
      const user = await prisma.user.create({
        data: {
          name: userData.name,
          email: userData.email,
          phone: userData.phone,
          password: hashedPassword,
          role: userData.role,
          studentType: userData.studentType,
          accountStatus: "ACTIVE",
          emailVerified: new Date(),
          wallet: {
            create: {
              balance: Math.floor(Math.random() * 500) + 100, // Random balance between 100-600
            },
          },
        },
      });
      users.push(user);
    }
    console.log(`✅ Created ${users.length} users`);

    console.log("👨‍🏫 Creating instructors...");
    const instructors = [];
    for (const instructorData of instructorsData) {
      const hashedPassword = await bcrypt.hash(instructorData.password, 12);
      
      const instructorUser = await prisma.user.create({
        data: {
          name: instructorData.name,
          email: instructorData.email,
          phone: instructorData.phone,
          password: hashedPassword,
          role: instructorData.role,
          accountStatus: "ACTIVE",
          emailVerified: new Date(),
          wallet: {
            create: {
              balance: Math.floor(Math.random() * 1000) + 200,
            },
          },
        },
      });

      const instructor = await prisma.instructor.create({
        data: {
          userId: instructorUser.id,
          address: instructorData.address,
          translations: {
            create: [
              {
                language: "en",
                instructorBio: instructorData.bio.en,
                instructorName: instructorData.name,
                instructorJobTitle: instructorData.jobTitle.en,
              },
              {
                language: "ar",
                instructorBio: instructorData.bio.ar,
                instructorName: instructorData.name,
                instructorJobTitle: instructorData.jobTitle.ar,
              },
            ],
          },
          permissions: {
            create: {
              canCreateCourses: true,
            },
          },
        },
      });
      
      instructors.push(instructor);
    }
    console.log(`✅ Created ${instructors.length} instructors`);

    console.log("🎓 Creating specialists...");
    const specialists = [];
    for (const specialistData of specialistsData) {
      const specialist = await prisma.specialist.create({
        data: {
          image: specialistData.image,
          order: specialistData.order,
          translations: {
            create: [
              {
                language: "en",
                specialistName: specialistData.name.en,
                specialistTitle: specialistData.title.en,
              },
              {
                language: "ar",
                specialistName: specialistData.name.ar,
                specialistTitle: specialistData.title.ar,
              },
            ],
          },
        },
      });
      specialists.push(specialist);
    }
    console.log(`✅ Created ${specialists.length} specialists`);

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

    console.log("📚 Creating courses...");
    const coursesData = [
      {
        c_ID: 1001,
        categoryIndex: 0, // Mathematics
        instructorIndex: 0,
        courseType: "UNIVERSITY_STUDENT",
        courseLevel: "BEGINNER",
        price: 299,
        thumbnailUrl: "/courses-banner.png",
        translations: {
          en: {
            title: "Calculus Fundamentals",
            description: "Master the fundamentals of differential and integral calculus with practical applications.",
            brief: "A comprehensive introduction to calculus for university students.",
            learningPoints: ["Derivatives and their applications", "Integration techniques", "Limits and continuity"],
            targetAudience: ["University students", "Engineering majors", "Science students"],
            requirements: ["Basic algebra knowledge", "High school mathematics"],
          },
          ar: {
            title: "أساسيات التفاضل والتكامل",
            description: "إتقان أساسيات التفاضل والتكامل مع التطبيقات العملية.",
            brief: "مقدمة شاملة للتفاضل والتكامل لطلاب الجامعة.",
            learningPoints: ["المشتقات وتطبيقاتها", "تقنيات التكامل", "النهايات والاستمرارية"],
            targetAudience: ["طلاب الجامعة", "تخصصات الهندسة", "طلاب العلوم"],
            requirements: ["معرفة أساسية بالجبر", "رياضيات المرحلة الثانوية"],
          },
        },
      },
      {
        c_ID: 1002,
        categoryIndex: 1, // Physics
        instructorIndex: 1,
        courseType: "UNIVERSITY_STUDENT",
        courseLevel: "INTERMEDIATE",
        price: 399,
        thumbnailUrl: "/courses-banner.png",
        translations: {
          en: {
            title: "Quantum Physics Basics",
            description: "Introduction to quantum mechanics and modern physics concepts.",
            brief: "Explore the fascinating world of quantum physics.",
            learningPoints: ["Wave-particle duality", "Quantum states", "Heisenberg uncertainty principle"],
            targetAudience: ["Physics students", "Advanced learners", "Research enthusiasts"],
            requirements: ["Classical physics knowledge", "Basic calculus"],
          },
          ar: {
            title: "أساسيات الفيزياء الكمية",
            description: "مقدمة في ميكانيكا الكم ومفاهيم الفيزياء الحديثة.",
            brief: "استكشف العالم الرائع للفيزياء الكمية.",
            learningPoints: ["ازدواجية الموجة والجسيم", "الحالات الكمية", "مبدأ عدم اليقين"],
            targetAudience: ["طلاب الفيزياء", "المتعلمون المتقدمون", "محبو البحث"],
            requirements: ["معرفة الفيزياء الكلاسيكية", "أساسيات التفاضل والتكامل"],
          },
        },
      },
      {
        c_ID: 1003,
        categoryIndex: 4, // Computer Science
        instructorIndex: 2,
        courseType: "UNIVERSITY_STUDENT",
        courseLevel: "BEGINNER",
        price: 499,
        thumbnailUrl: "/courses-banner.png",
        translations: {
          en: {
            title: "Introduction to Programming",
            description: "Learn programming fundamentals using Python programming language.",
            brief: "Perfect course for beginners to start their programming journey.",
            learningPoints: ["Variables and data types", "Control structures", "Functions and modules"],
            targetAudience: ["Complete beginners", "University students", "Career changers"],
            requirements: ["Basic computer skills", "No prior programming experience needed"],
          },
          ar: {
            title: "مقدمة في البرمجة",
            description: "تعلم أساسيات البرمجة باستخدام لغة البرمجة Python.",
            brief: "الدورة المثالية للمبتدئين لبدء رحلتهم في البرمجة.",
            learningPoints: ["المتغيرات وأنواع البيانات", "هياكل التحكم", "الدوال والوحدات"],
            targetAudience: ["المبتدئون تماماً", "طلاب الجامعة", "من يريدون تغيير مسارهم المهني"],
            requirements: ["مهارات الحاسوب الأساسية", "لا حاجة لخبرة برمجية سابقة"],
          },
        },
      },
      {
        c_ID: 1004,
        categoryIndex: 2, // Chemistry
        instructorIndex: 0,
        courseType: "SCHOOL_STUDENT",
        courseLevel: "BEGINNER",
        price: 199,
        thumbnailUrl: "/courses-banner.png",
        translations: {
          en: {
            title: "Organic Chemistry Basics",
            description: "Fundamental concepts of organic chemistry for high school students.",
            brief: "Master the basics of carbon-based chemistry.",
            learningPoints: ["Carbon bonding", "Functional groups", "Reaction mechanisms"],
            targetAudience: ["High school students", "Chemistry enthusiasts", "Pre-med students"],
            requirements: ["Basic chemistry knowledge", "Understanding of atomic structure"],
          },
          ar: {
            title: "أساسيات الكيمياء العضوية",
            description: "المفاهيم الأساسية للكيمياء العضوية لطلاب المرحلة الثانوية.",
            brief: "إتقان أساسيات كيمياء المركبات الكربونية.",
            learningPoints: ["الروابط الكربونية", "المجموعات الوظيفية", "آليات التفاعل"],
            targetAudience: ["طلاب المرحلة الثانوية", "محبو الكيمياء", "طلاب ما قبل الطب"],
            requirements: ["معرفة أساسية بالكيمياء", "فهم التركيب الذري"],
          },
        },
      },
    ];

    const courses = [];
    for (let i = 0; i < coursesData.length; i++) {
      const courseData = coursesData[i];
      const instructor = instructors[courseData.instructorIndex];
      const category = categories[courseData.categoryIndex];
      
      const course = await prisma.course.create({
        data: {
          c_ID: courseData.c_ID,
          instructorIds: [instructor.id],
          ownerId: instructor.id,
          courseType: courseData.courseType,
          courseLevel: courseData.courseLevel,
          price: courseData.price,
          thumbnailUrl: courseData.thumbnailUrl,
          categoryId: category.id,
          courseTotalMinutes: Math.floor(Math.random() * 480) + 120, // 2-10 hours
          translations: {
            create: [
              {
                language: "en",
                courseTitle: courseData.translations.en.title,
                courseDescription: courseData.translations.en.description,
                courseBrief: courseData.translations.en.brief,
                learningPoints: courseData.translations.en.learningPoints,
                targetAudience: courseData.translations.en.targetAudience,
                requirements: courseData.translations.en.requirements,
              },
              {
                language: "ar",
                courseTitle: courseData.translations.ar.title,
                courseDescription: courseData.translations.ar.description,
                courseBrief: courseData.translations.ar.brief,
                learningPoints: courseData.translations.ar.learningPoints,
                targetAudience: courseData.translations.ar.targetAudience,
                requirements: courseData.translations.ar.requirements,
              },
            ],
          },
        },
      });
      courses.push(course);
    }
    console.log(`✅ Created ${courses.length} courses`);

    console.log("📖 Creating units and lessons...");
    for (let i = 0; i < courses.length; i++) {
      const course = courses[i];
      const unitCount = Math.floor(Math.random() * 3) + 2; // 2-4 units per course
      
      for (let unitOrder = 1; unitOrder <= unitCount; unitOrder++) {
        const unit = await prisma.unit.create({
          data: {
            courseId: course.id,
            order: unitOrder,
            translations: {
              create: [
                {
                  language: "en",
                  unitTitle: `Unit ${unitOrder}`,
                  unitDescription: `This is unit ${unitOrder} of the course.`,
                },
                {
                  language: "ar",
                  unitTitle: `الوحدة ${unitOrder}`,
                  unitDescription: `هذه هي الوحدة ${unitOrder} من الدورة.`,
                },
              ],
            },
          },
        });

        const lessonCount = Math.floor(Math.random() * 4) + 2; // 2-5 lessons per unit
        for (let lessonOrder = 1; lessonOrder <= lessonCount; lessonOrder++) {
          await prisma.lesson.create({
            data: {
              unitId: unit.id,
              order: lessonOrder,
              videoId: `video_${course.c_ID}_${unitOrder}_${lessonOrder}`,
              pdfUrl: [`/pdf_${course.c_ID}_${unitOrder}_${lessonOrder}.pdf`],
              translations: {
                create: [
                  {
                    language: "en",
                    lessonTitle: `Lesson ${lessonOrder}`,
                    lessonDescription: `Detailed explanation of lesson ${lessonOrder} concepts.`,
                  },
                  {
                    language: "ar",
                    lessonTitle: `الدرس ${lessonOrder}`,
                    lessonDescription: `شرح مفصل لمفاهيم الدرس ${lessonOrder}.`,
                  },
                ],
              },
            },
          });
        }
      }
    }
    console.log("✅ Created units and lessons for all courses");

    console.log("📝 Creating user enrollments and course progress...");
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const enrolledCoursesCount = Math.floor(Math.random() * 3) + 1; // 1-3 courses per user
      const enrolledCourses = courses.slice(0, enrolledCoursesCount);
      
      for (const course of enrolledCourses) {
        // Create course progress
        const progress = Math.floor(Math.random() * 100);
        await prisma.courseProgress.create({
          data: {
            userId: user.id,
            courseId: course.id,
            progress: progress,
            completed: progress === 100,
            lastAccessed: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000), // Random date within last week
          },
        });

        // Create wallet transaction for course purchase
        const userWallet = await prisma.wallet.findUnique({
          where: { userId: user.id },
        });

        const walletTransaction = await prisma.walletTransaction.create({
          data: {
            walletId: userWallet.id,
            amount: -course.price, // Negative for purchase
            type: "COURSE_PURCHASE",
            status: "COMPLETED",
            courseId: course.id,
            notes: `Purchase of course: ${course.c_ID}`,
          },
        });

        await prisma.courseTransaction.create({
          data: {
            courseId: course.id,
            userId: user.id,
            walletTransactionId: walletTransaction.id,
            purchasePrice: course.price,
            status: "COMPLETED",
          },
        });

        // Update enrolled students in course
        await prisma.course.update({
          where: { id: course.id },
          data: {
            enrolledStudentIds: {
              push: user.id,
            },
          },
        });
      }
    }
    console.log("✅ Created user enrollments and course progress");

    console.log("⭐ Creating course reviews...");
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const reviewCount = Math.floor(Math.random() * 2) + 1; // 1-2 reviews per user
      
      for (let j = 0; j < reviewCount && j < courses.length; j++) {
        const course = courses[j];
        const rating = Math.floor(Math.random() * 3) + 3; // 3-5 stars
        const comments = [
          "Excellent course with clear explanations!",
          "Very helpful content and great instructor.",
          "Good course material, learned a lot.",
          "Highly recommended for beginners.",
          "Great pace and comprehensive coverage.",
        ];
        
        await prisma.review.create({
          data: {
            userId: user.id,
            courseId: course.id,
            rating: rating,
            comment: comments[Math.floor(Math.random() * comments.length)],
          },
        });
      }
    }
    console.log("✅ Created course reviews");

    console.log("❤️ Creating user favorites...");
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      const favoriteCount = Math.floor(Math.random() * 2) + 1; // 1-2 favorites per user
      
      for (let j = 0; j < favoriteCount && j < courses.length; j++) {
        await prisma.userFavorite.create({
          data: {
            userId: user.id,
            courseId: courses[j].id,
          },
        });
      }
    }
    console.log("✅ Created user favorites");

    console.log("💰 Creating additional wallet transactions...");
    for (const user of users) {
      const userWallet = await prisma.wallet.findUnique({
        where: { userId: user.id },
      });

      // Credit purchase transaction
      await prisma.walletTransaction.create({
        data: {
          walletId: userWallet.id,
          amount: Math.floor(Math.random() * 200) + 100, // Random credit purchase
          type: "CREDIT_PURCHASE",
          status: "COMPLETED",
          notes: "Credit top-up",
          invoiceUrl: `/invoice_${user.id}_${Date.now()}.pdf`,
        },
      });
    }
    console.log("✅ Created additional wallet transactions");

    console.log("\n🎉 Database seeding completed successfully!");
    console.log("📊 Summary:");
    console.log(`   👨‍💼 Super Admin: 1`);
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   👨‍🏫 Instructors: ${instructors.length}`);
    console.log(`   🎓 Specialists: ${specialists.length}`);
    console.log(`   📚 Categories: ${categories.length}`);
    console.log(`   📖 Courses: ${courses.length}`);
    console.log(`   📝 Course Progress: Created for all enrollments`);
    console.log(`   ⭐ Reviews: Multiple reviews per course`);
    console.log(`   ❤️ Favorites: User favorites created`);
    console.log(`   💰 Transactions: Comprehensive transaction history`);
    
    console.log("\n📋 Super Admin Credentials:");
    console.log(`   Email: ${superAdminData.email}`);
    console.log(`   Password: ${superAdminData.password}`);
    console.log("⚠️  Please change the password after first login!");
    
  } catch (error) {
    console.error("Error in database operations:", error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
