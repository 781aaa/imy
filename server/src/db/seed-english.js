'use strict';

const {
  getDb,
  closeDb,
  transaction,
  lastInsertId,
} = require('./connection');
const { migrate } = require('./migrate');
const { now } = require('../utils/datetime');
const { ROLES } = require('../config/constants');

const ENGLISH_BANK_VERSION = '1.0.0';
const ENGLISH_EXAM_VERSION = '1.0.0';

const LEVELS = [
  {
    name: '英语A级',
    description: '高等学校英语应用能力考试 A 级',
    children: ['词汇与语法', '阅读理解', '翻译与写作'],
  },
  {
    name: '大学英语四级',
    description: 'CET-4 词汇、语法、阅读、翻译与写作',
    children: ['词汇与语法', '阅读理解', '翻译与写作'],
  },
  {
    name: '专升本英语',
    description: '专升本英语通用题型',
    children: ['词汇与语法', '阅读理解', '翻译与写作'],
  },
];

const QUESTIONS = [
  {
    level: '英语A级',
    topic: '词汇与语法',
    type: 'single',
    stem: 'The manager asked us to ______ the report before Friday.',
    options: [
      { label: 'A', content: 'submit' },
      { label: 'B', content: 'subtract' },
      { label: 'C', content: 'subscribe' },
      { label: 'D', content: 'substitute' },
    ],
    answer: 'A',
    analysis: 'submit 提交；subtract 减去；subscribe 订阅；substitute 替代。',
    difficulty: 1,
    score: 3,
  },
  {
    level: '英语A级',
    topic: '词汇与语法',
    type: 'single',
    stem: 'The heavy rain caused serious ______ to the crops.',
    options: [
      { label: 'A', content: 'damage' },
      { label: 'B', content: 'damages' },
      { label: 'C', content: 'damaging' },
      { label: 'D', content: 'damaged' },
    ],
    answer: 'A',
    analysis: 'damage 表示“损害”时是不可数名词，不能用复数。',
    difficulty: 2,
    score: 3,
  },
  {
    level: '英语A级',
    topic: '词汇与语法',
    type: 'single',
    stem: 'If I ______ you, I would accept the offer.',
    options: [
      { label: 'A', content: 'am' },
      { label: 'B', content: 'was' },
      { label: 'C', content: 'were' },
      { label: 'D', content: 'be' },
    ],
    answer: 'C',
    analysis: '与现在事实相反的虚拟条件句，if 从句中 be 动词一律用 were。',
    difficulty: 1,
    score: 3,
  },
  {
    level: '英语A级',
    topic: '词汇与语法',
    type: 'single',
    stem: 'The meeting ______ until next Monday because of the storm.',
    options: [
      { label: 'A', content: 'put off' },
      { label: 'B', content: 'was put off' },
      { label: 'C', content: 'has put off' },
      { label: 'D', content: 'puts off' },
    ],
    answer: 'B',
    analysis: '会议是被推迟的，要用被动语态 was put off。',
    difficulty: 2,
    score: 3,
  },
  {
    level: '英语A级',
    topic: '词汇与语法',
    type: 'single',
    stem: 'It is important that every student ______ the safety rules.',
    options: [
      { label: 'A', content: 'follows' },
      { label: 'B', content: 'follow' },
      { label: 'C', content: 'followed' },
      { label: 'D', content: 'will follow' },
    ],
    answer: 'B',
    analysis: 'It is important that 后的从句使用虚拟语气 (should) + 动词原形。',
    difficulty: 3,
    score: 3,
  },
  {
    level: '英语A级',
    topic: '阅读理解',
    type: 'single',
    stem: 'Notice: The library will be closed from July 15 to July 20 for maintenance. Books borrowed before July 10 can be returned on July 21 without a fine. The reading room on the second floor will reopen on July 22.\n\nQuestion: When will the reading room reopen?',
    options: [
      { label: 'A', content: 'July 15' },
      { label: 'B', content: 'July 20' },
      { label: 'C', content: 'July 21' },
      { label: 'D', content: 'July 22' },
    ],
    answer: 'D',
    analysis: '通知最后一句说明阅览室将于 7 月 22 日重新开放。',
    difficulty: 1,
    score: 3,
  },
  {
    level: '英语A级',
    topic: '阅读理解',
    type: 'true_false',
    stem: 'Notice: The library will be closed from July 15 to July 20 for maintenance. Books borrowed before July 10 can be returned on July 21 without a fine.\n\nStatement: Books returned on July 21 will not be fined.',
    answer: 'true',
    analysis: '通知明确说明 7 月 21 日归还的书不会产生罚款。',
    difficulty: 1,
    score: 2,
  },
  {
    level: '英语A级',
    topic: '词汇与语法',
    type: 'fill',
    stem: 'The new system is more ______ (efficiency) than the old one.',
    answer: ['efficient'],
    analysis: 'be 动词后接形容词作表语，efficiency 的形容词形式是 efficient。',
    difficulty: 2,
    score: 3,
  },
  {
    level: '英语A级',
    topic: '翻译与写作',
    type: 'short',
    stem: '请把下面的句子翻译成英语：我们期待尽快收到您的回复。',
    answer: 'We look forward to receiving your reply as soon as possible. / We are looking forward to hearing from you soon.',
    analysis: 'look forward to 后接动名词；as soon as possible 表示“尽快”。',
    difficulty: 2,
    score: 10,
  },
  {
    level: '英语A级',
    topic: '翻译与写作',
    type: 'short',
    stem: 'Write a notice of about 60 words to inform students that the English Corner will be held in the school library at 7 p.m. this Friday. Include the time, place and activity.',
    answer: 'Notice\n\nThe English Corner will be held in the school library at 7 p.m. this Friday. All students are welcome to join us. We will practice spoken English through games, discussions and short speeches. Please arrive on time and bring your ideas.\n\nThe Student Union',
    analysis: '通知需包含时间、地点、活动内容，语言简洁正式，结尾可署名。',
    difficulty: 2,
    score: 15,
  },

  {
    level: '英语A级',
    topic: '词汇与语法',
    type: 'single',
    stem: 'We are looking forward to ______ from you soon.',
    options: [
      { label: 'A', content: 'hear' },
      { label: 'B', content: 'hearing' },
      { label: 'C', content: 'heard' },
      { label: 'D', content: 'be heard' },
    ],
    answer: 'B',
    analysis: 'look forward to 中的 to 是介词，后接动名词 hearing。',
    difficulty: 2,
    score: 3,
  },
  {
    level: '英语A级',
    topic: '词汇与语法',
    type: 'single',
    stem: 'The company provides free ______ for all new employees.',
    options: [
      { label: 'A', content: 'train' },
      { label: 'B', content: 'training' },
      { label: 'C', content: 'trained' },
      { label: 'D', content: 'trainer' },
    ],
    answer: 'B',
    analysis: '形容词 free 后接名词，training 表示“培训”。',
    difficulty: 1,
    score: 3,
  },
  {
    level: '英语A级',
    topic: '词汇与语法',
    type: 'single',
    stem: 'Please ______ me if you need any help.',
    options: [
      { label: 'A', content: 'contact' },
      { label: 'B', content: 'contact with' },
      { label: 'C', content: 'contact to' },
      { label: 'D', content: 'contact for' },
    ],
    answer: 'A',
    analysis: 'contact 作及物动词时直接接宾语，不加介词。',
    difficulty: 2,
    score: 3,
  },
  {
    level: '英语A级',
    topic: '词汇与语法',
    type: 'single',
    stem: 'The price of the product ______ by 10% last month.',
    options: [
      { label: 'A', content: 'rose' },
      { label: 'B', content: 'raised' },
      { label: 'C', content: 'was risen' },
      { label: 'D', content: 'was raised' },
    ],
    answer: 'A',
    analysis: 'rise 是不及物动词，表示“上升”；raise 是及物动词，需要宾语。',
    difficulty: 3,
    score: 3,
  },
  {
    level: '英语A级',
    topic: '词汇与语法',
    type: 'single',
    stem: 'It took him three hours ______ the report.',
    options: [
      { label: 'A', content: 'finish' },
      { label: 'B', content: 'finishing' },
      { label: 'C', content: 'to finish' },
      { label: 'D', content: 'finished' },
    ],
    answer: 'C',
    analysis: 'It takes sb. some time to do sth. 是固定句型。',
    difficulty: 1,
    score: 3,
  },
  {
    level: '英语A级',
    topic: '词汇与语法',
    type: 'single',
    stem: 'Neither the manager nor the employees ______ satisfied with the plan.',
    options: [
      { label: 'A', content: 'is' },
      { label: 'B', content: 'are' },
      { label: 'C', content: 'was' },
      { label: 'D', content: 'has' },
    ],
    answer: 'B',
    analysis: 'neither...nor... 连接主语时，谓语动词遵循就近原则，靠近 employees，用复数 are。',
    difficulty: 3,
    score: 3,
  },
  {
    level: '英语A级',
    topic: '词汇与语法',
    type: 'single',
    stem: 'The meeting will be held ______ the morning of May 20.',
    options: [
      { label: 'A', content: 'in' },
      { label: 'B', content: 'on' },
      { label: 'C', content: 'at' },
      { label: 'D', content: 'for' },
    ],
    answer: 'B',
    analysis: '具体某一天的上午用介词 on。',
    difficulty: 1,
    score: 3,
  },
  {
    level: '英语A级',
    topic: '词汇与语法',
    type: 'single',
    stem: 'He is used to ______ up early.',
    options: [
      { label: 'A', content: 'get' },
      { label: 'B', content: 'getting' },
      { label: 'C', content: 'got' },
      { label: 'D', content: 'gets' },
    ],
    answer: 'B',
    analysis: 'be used to 表示“习惯于”，to 是介词，后接动名词。',
    difficulty: 2,
    score: 3,
  },
  {
    level: '英语A级',
    topic: '阅读理解',
    type: 'single',
    stem: 'Welcome to the City Museum. The museum is open from 9 a.m. to 5 p.m. from Tuesday to Sunday. It is closed on Mondays. Admission is free for children under 12 and for senior citizens over 65. Students with a valid ID card pay half price. Photography is allowed, but please turn off the flash.\n\nQuestion: When is the museum closed?',
    options: [
      { label: 'A', content: 'Mondays' },
      { label: 'B', content: 'Tuesdays' },
      { label: 'C', content: 'Sundays' },
      { label: 'D', content: 'Holidays' },
    ],
    answer: 'A',
    analysis: '文中明确说明博物馆每周一闭馆。',
    difficulty: 1,
    score: 3,
  },
  {
    level: '英语A级',
    topic: '阅读理解',
    type: 'true_false',
    stem: 'Welcome to the City Museum. Admission is free for children under 12 and for senior citizens over 65. Students with a valid ID card pay half price.\n\nStatement: All students can enter the museum for free.',
    answer: 'false',
    analysis: '文中说持有效证件的学生半价，并非免费。',
    difficulty: 1,
    score: 2,
  },
  {
    level: '英语A级',
    topic: '阅读理解',
    type: 'single',
    stem: 'Welcome to the City Museum. Photography is allowed, but please turn off the flash.\n\nQuestion: What are visitors asked to do when taking photos?',
    options: [
      { label: 'A', content: 'Pay extra.' },
      { label: 'B', content: 'Turn off the flash.' },
      { label: 'C', content: 'Leave their bags.' },
      { label: 'D', content: 'Ask for permission.' },
    ],
    answer: 'B',
    analysis: '文中要求拍照时关闭闪光灯。',
    difficulty: 1,
    score: 3,
  },
  {
    level: '英语A级',
    topic: '阅读理解',
    type: 'single',
    stem: 'A recent study shows that people who walk at least 7,000 steps a day have a lower risk of heart disease than those who walk fewer than 4,000 steps. The researchers also found that walking faster brings additional benefits. However, they remind people to choose a pace that suits their health condition.\n\nQuestion: What is the main finding of the study?',
    options: [
      { label: 'A', content: 'Walking 7,000 steps a day reduces heart disease risk.' },
      { label: 'B', content: 'Walking slowly is harmful.' },
      { label: 'C', content: 'People should walk 4,000 steps.' },
      { label: 'D', content: 'Heart disease cannot be prevented.' },
    ],
    answer: 'A',
    analysis: '研究的主要发现是每天至少走 7000 步的人患心脏病风险更低。',
    difficulty: 2,
    score: 3,
  },
  {
    level: '英语A级',
    topic: '阅读理解',
    type: 'true_false',
    stem: 'Researchers found that walking faster brings additional benefits, but they remind people to choose a pace that suits their health condition.\n\nStatement: The researchers suggest everyone should walk as fast as possible.',
    answer: 'false',
    analysis: '研究者提醒人们选择适合自身健康状况的步速，而不是越快越好。',
    difficulty: 2,
    score: 2,
  },
  {
    level: '英语A级',
    topic: '翻译与写作',
    type: 'short',
    stem: '请把下面的句子翻译成英语：这台机器操作起来很方便。',
    answer: 'This machine is easy to operate.',
    analysis: '“操作起来很方便”可用 be easy to operate 表达。',
    difficulty: 2,
    score: 10,
  },
  {
    level: '英语A级',
    topic: '翻译与写作',
    type: 'short',
    stem: '请把下面的句子翻译成英语：我们公司将在下个月推出一款新产品。',
    answer: 'Our company will launch a new product next month.',
    analysis: '“推出”用 launch；next month 前不加介词。',
    difficulty: 2,
    score: 10,
  },
  {
    level: '英语A级',
    topic: '翻译与写作',
    type: 'short',
    stem: 'Write a short email (about 80 words) to a customer to apologize for a delayed delivery and explain what you will do.',
    answer: 'Dear Mr. Smith,\n\nI am writing to apologize for the delay in delivering your order. Due to an unexpected shortage of stock, your order was not shipped on time. We have now arranged for it to be sent by express delivery, and it should reach you within two working days. We sincerely apologize for any inconvenience this has caused.\n\nYours sincerely,\nLi Ming',
    analysis: '道歉信结构：说明问题、解释原因、给出补救措施、再次致歉。',
    difficulty: 2,
    score: 15,
  },
  {
    level: '英语A级',
    topic: '翻译与写作',
    type: 'short',
    stem: 'Write a short letter (about 80 words) applying for a part-time job in a bookstore.',
    answer: 'Dear Manager,\n\nI am writing to apply for the part-time job in your bookstore. I am a college student and I love reading. I am available on weekends and I am good at communication. I believe I can help customers find the books they need. I have attached my resume for your consideration. I would appreciate the opportunity to discuss my application with you.\n\nYours sincerely,\nLi Hua',
    analysis: '求职信结构：说明求职意向、介绍自身优势、说明可工作时间、表达感谢。',
    difficulty: 2,
    score: 15,
  },

  {
    level: '大学英语四级',
    topic: '词汇与语法',
    type: 'single',
    stem: 'The government has taken measures to ______ the spread of the disease.',
    options: [
      { label: 'A', content: 'curb' },
      { label: 'B', content: 'cure' },
      { label: 'C', content: 'curve' },
      { label: 'D', content: 'curl' },
    ],
    answer: 'A',
    analysis: 'curb 遏制；cure 治愈；curve 弯曲；curl 卷曲。',
    difficulty: 3,
    score: 3,
  },
  {
    level: '大学英语四级',
    topic: '词汇与语法',
    type: 'single',
    stem: 'His explanation was so ______ that everyone understood it immediately.',
    options: [
      { label: 'A', content: 'vague' },
      { label: 'B', content: 'clear' },
      { label: 'C', content: 'ambiguous' },
      { label: 'D', content: 'obscure' },
    ],
    answer: 'B',
    analysis: 'so...that 表示“如此……以至于”，人人都听懂说明解释很清楚，选 clear。',
    difficulty: 2,
    score: 3,
  },
  {
    level: '大学英语四级',
    topic: '词汇与语法',
    type: 'single',
    stem: 'No sooner ______ the classroom than the bell rang.',
    options: [
      { label: 'A', content: 'he had entered' },
      { label: 'B', content: 'had he entered' },
      { label: 'C', content: 'he entered' },
      { label: 'D', content: 'did he enter' },
    ],
    answer: 'B',
    analysis: 'No sooner 置于句首时主句部分倒装，且用过去完成时：had he entered。',
    difficulty: 3,
    score: 3,
  },
  {
    level: '大学英语四级',
    topic: '词汇与语法',
    type: 'single',
    stem: 'The professor insisted that the experiment ______ under strict conditions.',
    options: [
      { label: 'A', content: 'is conducted' },
      { label: 'B', content: 'was conducted' },
      { label: 'C', content: 'be conducted' },
      { label: 'D', content: 'conducted' },
    ],
    answer: 'C',
    analysis: 'insist 表示“坚持要求”时，从句使用虚拟语气 (should) + 动词原形，且实验是被进行的，用被动。',
    difficulty: 3,
    score: 3,
  },
  {
    level: '大学英语四级',
    topic: '词汇与语法',
    type: 'multiple',
    stem: "Which of the following words are closest in meaning to 'significant'?",
    options: [
      { label: 'A', content: 'important' },
      { label: 'B', content: 'trivial' },
      { label: 'C', content: 'considerable' },
      { label: 'D', content: 'minor' },
    ],
    answer: ['A', 'C'],
    analysis: 'significant 表示“重要的、相当大的”；trivial 和 minor 意为“琐碎的、次要的”。',
    difficulty: 3,
    score: 4,
  },
  {
    level: '大学英语四级',
    topic: '词汇与语法',
    type: 'multiple',
    stem: 'Which of the following sentences are grammatically correct?',
    options: [
      { label: 'A', content: 'Neither of the answers is correct.' },
      { label: 'B', content: 'Neither of the answers are correct.' },
      { label: 'C', content: 'Each of the students has a book.' },
      { label: 'D', content: 'Each of the students have a book.' },
    ],
    answer: ['A', 'C'],
    analysis: 'neither of 和 each of 作主语时，谓语动词通常用单数。',
    difficulty: 3,
    score: 4,
  },
  {
    level: '大学英语四级',
    topic: '阅读理解',
    type: 'single',
    stem: 'Remote work has become increasingly common in recent years. According to a 2024 survey, 62% of employees prefer a hybrid arrangement, while only 18% want to work fully remotely. Managers, however, worry less about productivity than about team communication and the loss of informal exchanges.\n\nQuestion: What percentage of employees prefer a hybrid arrangement?',
    options: [
      { label: 'A', content: '18%' },
      { label: 'B', content: '62%' },
      { label: 'C', content: '80%' },
      { label: 'D', content: '2024%' },
    ],
    answer: 'B',
    analysis: '文中明确指出 62% 的员工更倾向于混合办公。',
    difficulty: 2,
    score: 3,
  },
  {
    level: '大学英语四级',
    topic: '阅读理解',
    type: 'true_false',
    stem: 'Remote work has become increasingly common. Managers worry less about productivity than about team communication and the loss of informal exchanges.\n\nStatement: Managers are mainly worried about employees\' productivity when they work from home.',
    answer: 'false',
    analysis: '文中说管理者更担心团队沟通和非正式交流的减少，而不是生产力。',
    difficulty: 2,
    score: 2,
  },
  {
    level: '大学英语四级',
    topic: '阅读理解',
    type: 'single',
    stem: 'Sleep researchers have found that students who keep a regular sleep schedule perform better on memory tests than those who sleep the same number of hours but go to bed at different times. The findings suggest that consistency, not just duration, matters for learning.\n\nQuestion: What does the research suggest?',
    options: [
      { label: 'A', content: 'Sleep duration is unimportant.' },
      { label: 'B', content: 'A regular sleep schedule helps memory.' },
      { label: 'C', content: 'Students should sleep less.' },
      { label: 'D', content: 'Memory tests are unreliable.' },
    ],
    answer: 'B',
    analysis: '研究结论是“规律性，而不仅仅是时长，对学习很重要”。',
    difficulty: 3,
    score: 3,
  },
  {
    level: '大学英语四级',
    topic: '词汇与语法',
    type: 'fill',
    stem: "The company's success depends largely on the ______ (create) of its employees.",
    answer: ['creativity'],
    analysis: '定冠词 the 后需要名词，create 的名词形式是 creativity。',
    difficulty: 2,
    score: 3,
  },
  {
    level: '大学英语四级',
    topic: '翻译与写作',
    type: 'short',
    stem: '请把下面的句子翻译成英语：随着科技的发展，人们的生活方式发生了巨大变化。',
    answer: "With the development of technology, people's way of life has changed dramatically.",
    analysis: 'with 引导伴随状语；has changed 用现在完成时；dramatically 表示“巨大地”。',
    difficulty: 3,
    score: 10,
  },
  {
    level: '大学英语四级',
    topic: '翻译与写作',
    type: 'short',
    stem: 'Write a short essay of about 120 words on the importance of lifelong learning.',
    answer: 'Lifelong learning is essential in a rapidly changing world. First, new technologies and social changes make it necessary to update our knowledge continuously. Second, learning new skills improves our competitiveness in the job market. Third, lifelong learning keeps our minds active and helps us adapt to new challenges. Therefore, we should develop the habit of reading, taking courses and reflecting on our experience throughout our lives.',
    analysis: '议论文结构：观点 + 两到三个理由 + 结论；注意连接词和段落层次。',
    difficulty: 3,
    score: 15,
  },

  {
    level: '专升本英语',
    topic: '词汇与语法',
    type: 'single',
    stem: 'She has a strong ______ for classical music.',
    options: [
      { label: 'A', content: 'preference' },
      { label: 'B', content: 'reference' },
      { label: 'C', content: 'difference' },
      { label: 'D', content: 'inference' },
    ],
    answer: 'A',
    analysis: 'have a preference for 表示“偏爱……”。',
    difficulty: 3,
    score: 3,
  },
  {
    level: '专升本英语',
    topic: '词汇与语法',
    type: 'single',
    stem: 'The two brothers look so ______ that I often mistake one for the other.',
    options: [
      { label: 'A', content: 'alike' },
      { label: 'B', content: 'likely' },
      { label: 'C', content: 'like' },
      { label: 'D', content: 'unlike' },
    ],
    answer: 'A',
    analysis: 'look alike 表示“看起来相像”；likely 意为“可能的”。',
    difficulty: 2,
    score: 3,
  },
  {
    level: '专升本英语',
    topic: '词汇与语法',
    type: 'single',
    stem: 'Hardly ______ the station when the train left.',
    options: [
      { label: 'A', content: 'he reached' },
      { label: 'B', content: 'had he reached' },
      { label: 'C', content: 'he had reached' },
      { label: 'D', content: 'did he reach' },
    ],
    answer: 'B',
    analysis: 'Hardly 置于句首时部分倒装，且用过去完成时：had he reached。',
    difficulty: 4,
    score: 3,
  },
  {
    level: '专升本英语',
    topic: '词汇与语法',
    type: 'single',
    stem: 'It was not until midnight ______ he finished his homework.',
    options: [
      { label: 'A', content: 'when' },
      { label: 'B', content: 'that' },
      { label: 'C', content: 'which' },
      { label: 'D', content: 'since' },
    ],
    answer: 'B',
    analysis: '强调句型 It was not until... that...，强调时间状语。',
    difficulty: 4,
    score: 3,
  },
  {
    level: '专升本英语',
    topic: '词汇与语法',
    type: 'single',
    stem: 'The book, ______ cover is red, belongs to my sister.',
    options: [
      { label: 'A', content: 'whose' },
      { label: 'B', content: 'which' },
      { label: 'C', content: 'that' },
      { label: 'D', content: 'what' },
    ],
    answer: 'A',
    analysis: '非限制性定语从句中表示所属关系，用 whose。',
    difficulty: 3,
    score: 3,
  },
  {
    level: '专升本英语',
    topic: '词汇与语法',
    type: 'multiple',
    stem: 'Which of the following words can be used to describe something difficult?',
    options: [
      { label: 'A', content: 'hard' },
      { label: 'B', content: 'challenging' },
      { label: 'C', content: 'simple' },
      { label: 'D', content: 'tough' },
    ],
    answer: ['A', 'B', 'D'],
    analysis: 'hard、challenging、tough 都可表示“困难的”；simple 表示“简单的”。',
    difficulty: 3,
    score: 4,
  },
  {
    level: '专升本英语',
    topic: '阅读理解',
    type: 'single',
    stem: 'Many students believe that memorizing word lists is the best way to learn English. However, research suggests that words are better remembered when they are learned in context, for example through reading and listening. Word lists can still be useful, but they should not be the only method.\n\nQuestion: According to the passage, how can words be better remembered?',
    options: [
      { label: 'A', content: 'By memorizing lists only.' },
      { label: 'B', content: 'By learning them in context.' },
      { label: 'C', content: 'By translating every word.' },
      { label: 'D', content: 'By writing them repeatedly.' },
    ],
    answer: 'B',
    analysis: '文中指出在语境中学习（如阅读和听力）更容易记住单词。',
    difficulty: 3,
    score: 3,
  },
  {
    level: '专升本英语',
    topic: '阅读理解',
    type: 'true_false',
    stem: 'Research suggests that words are better remembered when they are learned in context. Word lists can still be useful, but they should not be the only method.\n\nStatement: The passage suggests that word lists are completely useless.',
    answer: 'false',
    analysis: '文章说词表仍然有用，只是不应作为唯一方法，并非完全无用。',
    difficulty: 2,
    score: 2,
  },
  {
    level: '专升本英语',
    topic: '词汇与语法',
    type: 'fill',
    stem: 'The teacher encouraged us to read more English ______ (novel) in our spare time.',
    answer: ['novels'],
    analysis: 'more 后接可数名词复数，novel 的复数是 novels。',
    difficulty: 2,
    score: 3,
  },
  {
    level: '专升本英语',
    topic: '翻译与写作',
    type: 'short',
    stem: '请把下面的句子翻译成英语：只有通过不断练习，你才能提高英语水平。',
    answer: 'Only by constant practice can you improve your English.',
    analysis: 'Only + 状语置于句首时，主句部分倒装：can you improve。',
    difficulty: 4,
    score: 10,
  },
  {
    level: '专升本英语',
    topic: '翻译与写作',
    type: 'short',
    stem: 'Write an email of about 100 words to your friend, recommending an English learning app and explaining why you find it useful.',
    answer: 'Dear Tom,\n\nI would like to recommend an English learning app called "Daily English". I have been using it for three months, and it has helped me a lot. The app offers short lessons every day, so I can study whenever I have a few minutes. It also provides listening materials and vocabulary reviews, which are very useful for improving my listening and reading skills. Moreover, the exercises are interesting and easy to follow. I believe you will benefit from it too.\n\nYours,\nLi Hua',
    analysis: '邮件格式：称呼、正文（推荐 + 理由）、结尾落款；注意语气友好、条理清楚。',
    difficulty: 3,
    score: 15,
  },
];

function findTeacher(db) {
  return db.prepare(
    "SELECT * FROM users WHERE role = 'teacher' ORDER BY id ASC LIMIT 1",
  ).get();
}

function ensureKnowledgePoint(db, name, parentId, description, createdBy, timestamp) {
  const existing = parentId === null
    ? db.prepare(
      'SELECT * FROM knowledge_points WHERE name = ? AND parent_id IS NULL',
    ).get(name)
    : db.prepare(
      'SELECT * FROM knowledge_points WHERE name = ? AND parent_id = ?',
    ).get(name, parentId);

  if (existing) return Number(existing.id);

  const result = db.prepare(`
    INSERT INTO knowledge_points (
      name, parent_id, description, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?)
  `).run(name, parentId, description || '', createdBy, timestamp, timestamp);

  return lastInsertId(result);
}

function insertQuestion(db, question, knowledgePointId, createdBy, timestamp) {
  const answer = question.type === 'single'
    ? question.answer
    : question.answer;

  const questionResult = db.prepare(`
    INSERT INTO questions (
      type, stem, answer_json, analysis, difficulty, default_score,
      status, created_by, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, 'published', ?, ?, ?)
  `).run(
    question.type,
    question.stem,
    JSON.stringify(answer),
    question.analysis || '',
    question.difficulty,
    question.score,
    createdBy,
    timestamp,
    timestamp,
  );

  const questionId = lastInsertId(questionResult);

  if (Array.isArray(question.options)) {
    const optionStatement = db.prepare(`
      INSERT INTO question_options (question_id, label, content, is_correct, order_no)
      VALUES (?, ?, ?, ?, ?)
    `);

    question.options.forEach((option, index) => {
      const isCorrect = Array.isArray(answer)
        ? answer.includes(option.label)
        : answer === option.label;
      optionStatement.run(
        questionId,
        option.label,
        option.content,
        isCorrect ? 1 : 0,
        index,
      );
    });
  }

  if (knowledgePointId) {
    db.prepare(`
      INSERT INTO question_knowledge_points (question_id, knowledge_point_id)
      VALUES (?, ?)
    `).run(questionId, knowledgePointId);
  }

  return questionId;
}

function saveConfig(db, key, value, description, userId, timestamp) {
  db.prepare(`
    INSERT INTO system_configs (key, value_json, description, updated_by, updated_at)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(key) DO UPDATE SET
      value_json = excluded.value_json,
      description = excluded.description,
      updated_by = excluded.updated_by,
      updated_at = excluded.updated_at
  `).run(key, JSON.stringify(value), description, userId, timestamp);
}

function seedEnglishBank(db, teacher, timestamp) {
  const levelIds = {};
  const topicIds = {};

  for (const level of LEVELS) {
    const levelId = ensureKnowledgePoint(
      db,
      level.name,
      null,
      level.description,
      teacher.id,
      timestamp,
    );
    levelIds[level.name] = levelId;
    topicIds[level.name] = {};

    for (const topic of level.children) {
      const topicId = ensureKnowledgePoint(
        db,
        topic,
        levelId,
        `${level.name} · ${topic}`,
        teacher.id,
        timestamp,
      );
      topicIds[level.name][topic] = topicId;
    }
  }

  const idsByLevel = {};
  let count = 0;

  for (const question of QUESTIONS) {
    const knowledgePointId = topicIds[question.level][question.topic];
    const id = insertQuestion(db, question, knowledgePointId, teacher.id, timestamp);
    if (!idsByLevel[question.level]) idsByLevel[question.level] = [];
    idsByLevel[question.level].push(id);
    count += 1;
  }

  return { count, levelIds, topicIds, idsByLevel };
}

function createDemoExam(db, teacher, questionIds, timestamp) {
  const classRow = db.prepare(
    'SELECT * FROM classes WHERE teacher_id = ? ORDER BY id ASC LIMIT 1',
  ).get(teacher.id);

  if (!classRow || questionIds.length === 0) {
    return null;
  }

  const paperService = require('../services/paper.service');
  const examService = require('../services/exam.service');
  const actor = { id: Number(teacher.id), role: ROLES.TEACHER };

  const paper = paperService.createPaper({
    title: '英语A级模拟卷（演示）',
    description: '词汇与语法、阅读理解、翻译与写作综合练习',
    durationMin: 60,
  }, actor);

  const withSection = paperService.addSection(paper.id, {
    title: '一、综合题',
    description: '英语A级模拟',
  }, actor);

  const sectionId = withSection.sections[0].id;

  for (const questionId of questionIds) {
    paperService.addQuestion(paper.id, {
      questionId,
      sectionId,
    }, actor);
  }

  const published = paperService.publishPaper(paper.id, actor);

  const nowTs = Date.now();
  const exam = examService.createExam({
    title: '英语A级模拟考试（可试做）',
    description: '演示用英语A级模拟考试，七天内可作答',
    paperId: paper.id,
    startAt: nowTs - 60 * 1000,
    endAt: nowTs + 7 * 24 * 60 * 60 * 1000,
    durationMin: 60,
    passScore: Math.round(published.totalScore * 0.6),
    maxAttempts: 3,
    shuffleQuestions: false,
    shuffleOptions: false,
    classIds: [classRow.id],
  }, actor);

  examService.scheduleExam(exam.id, actor);

  return {
    paperId: paper.id,
    examId: exam.id,
    classId: Number(classRow.id),
    totalScore: published.totalScore,
  };
}

function seedEnglish(options = {}) {
  migrate({ silent: true });

  const db = getDb();
  const flag = db.prepare(
    "SELECT * FROM system_configs WHERE key = 'english_bank_version'",
  ).get();

  if (flag && !options.force) {
    return {
      skipped: true,
      reason: '英语题库已初始化，如需重装请删除 data/exam.db 后重新执行',
    };
  }

  const teacher = findTeacher(db);
  if (!teacher) {
    throw new Error('没有找到教师账号，请先执行 npm run db:seed');
  }

  const timestamp = now();

  const seeded = transaction(() => {
    const data = seedEnglishBank(db, teacher, timestamp);

    saveConfig(
      db,
      'english_bank_version',
      {
        version: ENGLISH_BANK_VERSION,
        levels: LEVELS.map((level) => level.name),
        questionCount: data.count,
        seededAt: timestamp,
      },
      '英语题库版本',
      teacher.id,
      timestamp,
    );

    return data;
  });

  // 演示考试要调用 service，内部自带事务，必须放在上面的事务提交之后执行
  const examFlag = db.prepare(
    "SELECT * FROM system_configs WHERE key = 'english_demo_exam_version'",
  ).get();

  let demoExam = null;

  if (!examFlag) {
    demoExam = createDemoExam(
      db,
      teacher,
      seeded.idsByLevel['英语A级'] || [],
      timestamp,
    );

    if (demoExam) {
      saveConfig(
        db,
        'english_demo_exam_version',
        { version: ENGLISH_EXAM_VERSION, ...demoExam, createdAt: timestamp },
        '英语演示考试版本',
        teacher.id,
        timestamp,
      );
    }
  }

  return {
    skipped: false,
    questionCount: seeded.count,
    levels: LEVELS.map((level) => level.name),
    demoExam,
  };
}

if (require.main === module) {
  try {
    const result = seedEnglish();
    if (result.skipped) {
      console.log(`[seed-english] ${result.reason}`);
    } else {
      console.log('[seed-english] 完成:', JSON.stringify(result));
      if (result.demoExam) {
        console.log(
          `[seed-english] 演示考试 #${result.demoExam.examId}，总分 ${result.demoExam.totalScore}，登录学生账号即可试做`,
        );
      }
      console.log('[seed-english] 学生账号: student01 / Stud@123');
    }
  } catch (error) {
    console.error('[seed-english] 失败:', error.message);
    process.exitCode = 1;
  } finally {
    closeDb();
  }
}

module.exports = {
  seedEnglish,
  QUESTIONS,
  LEVELS,
};
