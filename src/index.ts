import { Bot } from '@maxhub/max-bot-api';
import dotenv from 'dotenv';
import { NewsMonitor } from './service/newsMonitor';
import { getLatestNews } from './database';
import { formatNewsWithAI, generateMemoText } from './service/aiFormatter';
import { registerEmployee, getEmployeeByUserId, getEmployeeFIO } from './service/employeeService';
import { generateMemo, MemoData } from './service/memoGenerator';
import { generateMemoImage } from './service/memoImage';

dotenv.config();

const bot = new Bot(process.env.MAX_BOT_TOKEN!);
const newsMonitor = new NewsMonitor(
  process.env.BASE_URL_NEWS!,
  bot,
  parseInt(process.env.CHAT_ID_MAX!)
);

// Состояния пользователей для пошаговых диалогов
const userStates = new Map<number, { step: string; data: Record<string, string> }>();

// /start
bot.command('start', (ctx) => {
  ctx.reply(
    '👋 Добро пожаловать!\n\n' +
    'Доступные команды:\n' +
    '/register — Регистрация сотрудника\n' +
    '/memo — Создать служебную записку\n' +
    '/news — Последняя новость'
  );
});

// /register — регистрация сотрудника
bot.command('register', (ctx) => {
  const userId = ctx.message?.sender?.user_id;
  if (!userId) {
    ctx.reply('Не удалось определить пользователя.');
    return;
  }

  userStates.set(userId, { step: 'reg_last_name', data: {} });
  ctx.reply('📝 Регистрация сотрудника\n\nВведите вашу фамилию:');
});

// /memo — создание служебной записки
bot.command('memo', async (ctx) => {
  const userId = ctx.message?.sender?.user_id;
  if (!userId) {
    ctx.reply('Не удалось определить пользователя.');
    return;
  }

  const employee = await getEmployeeByUserId(userId);
  if (!employee) {
    ctx.reply('⚠️ Вы не зарегистрированы. Используйте /register для регистрации.');
    return;
  }

  userStates.set(userId, { step: 'memo_body', data: {} });
  ctx.reply('📄 Создание служебной записки\n\nОпишите кратко суть просьбы (например: "нужно закупить 3 монитора для кабинета 302"):');
});

// /news
bot.command('news', async (ctx) => {
  const latestNews = await getLatestNews();
  if (latestNews) {
    const formattedContent = latestNews.content
      ? await formatNewsWithAI(latestNews.content)
      : '';

    let message = `**${latestNews.title}**\n\n`;
    if (formattedContent) {
      message += `${formattedContent}\n\n`;
    }
    message += `🔗 ${latestNews.url}`;

    // Загружаем изображения через API
    const attachments = [];
    if (latestNews.images && latestNews.images.length > 0) {
      for (const imageUrl of latestNews.images) {
        try {
          const uploaded = await bot.api.uploadImage({ url: imageUrl });
          if (uploaded) {
            attachments.push(uploaded.toJson());
          }
        } catch (error) {
          console.error(`Failed to upload image: ${error}`);
        }
      }
    }

    ctx.reply(message, {
      attachments: attachments.length > 0 ? attachments : undefined,
      format: 'markdown',
    });
  } else {
    ctx.reply('Новостей пока нет.');
  }
});

bot.on('bot_started', (ctx) => {
  ctx.reply(
    '👋 Добро пожаловать!\n\n' +
    'Доступные команды:\n' +
    '/register — Регистрация сотрудника\n' +
    '/memo — Создать служебную записку\n' +
    '/news — Последняя новость'
  );
});

// Обработка сообщений — пошаговые диалоги
bot.on('message_created', async (ctx) => {
  const userId = ctx.message?.sender?.user_id;
  if (!userId) return;

  const text = ctx.message?.body?.text?.trim();
  if (!text) return;

  // Пропускаем команды
  if (text.startsWith('/')) return;

  const state = userStates.get(userId);
  if (!state) {
    ctx.reply('Используйте команды:\n/register — Регистрация\n/memo — Служебная записка\n/news — Новости');
    return;
  }

  // === РЕГИСТРАЦИЯ ===
  if (state.step === 'reg_last_name') {
    state.data.last_name = text;
    state.step = 'reg_first_name';
    ctx.reply('Введите ваше имя:');
    return;
  }

  if (state.step === 'reg_first_name') {
    state.data.first_name = text;
    state.step = 'reg_middle_name';
    ctx.reply('Введите ваше отчество (или "-" если нет):');
    return;
  }

  if (state.step === 'reg_middle_name') {
    state.data.middle_name = text === '-' ? '' : text;
    state.step = 'reg_position';
    ctx.reply('Введите вашу должность:');
    return;
  }

  if (state.step === 'reg_position') {
    state.data.position = text;
    state.step = 'reg_department';
    ctx.reply('Введите ваше подразделение (отдел/лабораторию):');
    return;
  }

  if (state.step === 'reg_department') {
    state.data.department = text;
    state.step = 'reg_phone';
    ctx.reply('Введите ваш внутренний телефон (или "-" если нет):');
    return;
  }

  if (state.step === 'reg_phone') {
    state.data.phone = text === '-' ? '' : text;

    const success = await registerEmployee({
      max_user_id: userId,
      last_name: state.data.last_name,
      first_name: state.data.first_name,
      middle_name: state.data.middle_name || undefined,
      position: state.data.position || undefined,
      department: state.data.department || undefined,
      phone: state.data.phone || undefined,
    });

    userStates.delete(userId);

    if (success) {
      const fio = `${state.data.last_name} ${state.data.first_name} ${state.data.middle_name || ''}`.trim();
      ctx.reply(`✅ Регистрация завершена!\n\nФИО: ${fio}\nДолжность: ${state.data.position}\nПодразделение: ${state.data.department}`);
    } else {
      ctx.reply('❌ Ошибка при регистрации. Попробуйте снова: /register');
    }
    return;
  }

  // === СЛУЖЕБНАЯ ЗАПИСКА ===
  if (state.step === 'memo_body') {
    state.data.body = text;
    userStates.delete(userId);

    const employee = await getEmployeeByUserId(userId);
    if (!employee) {
      ctx.reply('⚠️ Ошибка: сотрудник не найден.');
      return;
    }

    const fio = getEmployeeFIO(employee);

    // DeepSeek оформляет текст в официально-деловом стиле
    const memoBody = await generateMemoText(text);

    const memoData: MemoData = {
      recipientPosition: process.env.DIRECTOR_POSITION || 'Директору НТИ (филиал) СКФУ',
      recipientFIO: process.env.DIRECTOR_FIO || 'А.В. Ефанову',
      recipientName: process.env.DIRECTOR_FULL_NAME || 'Алексей Валерьевич',
      senderFIO: fio,
      senderPosition: employee.position || 'Сотрудник',
      body: memoBody,
      phone: employee.phone || undefined,
    };

    try {
      const imageBuffer = await generateMemoImage(memoData);

      // Загружаем изображение вручную через raw API
      const { url: uploadUrl } = await bot.api.raw.uploads.getUploadUrl({ type: 'image' });

      const formData = new FormData();
      formData.append('data', new Blob([new Uint8Array(imageBuffer)], { type: 'image/png' }), 'memo.png');

      const uploadRes = await fetch(uploadUrl, {
        method: 'POST',
        body: formData,
      });

      const uploadResult = await uploadRes.json() as { photos?: Record<string, { token: string }> };

      if (!uploadResult.photos) {
        console.error('Upload failed:', uploadResult);
        ctx.reply('❌ Ошибка загрузки изображения.');
        return;
      }

      const chatId = ctx.chatId;
      if (chatId) {
        await bot.api.sendMessageToChat(chatId, '', {
          attachments: [{
            type: 'image' as const,
            payload: {
              photos: uploadResult.photos,
            },
          }],
        });
      }
    } catch (error) {
      console.error('Error generating memo:', error);
      ctx.reply('❌ Ошибка при генерации документа. Попробуйте снова: /memo');
    }
    return;
  }
});

// Запускаем мониторинг новостей
newsMonitor.start().catch(console.error);

// Запускаем бота
bot.start();
