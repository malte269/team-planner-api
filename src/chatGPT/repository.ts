import axios from 'axios';

const axiosClient = axios.create({
  baseURL: 'https://api.openai.com/v1/chat/completions',
  headers: {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${process.env.OPENAI_API_KEY}`,
  },
});

export type ChatMessage = {
  role: 'assistant' | 'user' | 'system';
  content: string;
};

type ChatResponseType = { choices: [{ message: { content: string } }] };

export async function sendMessages(messages: ChatMessage[]) {
  const response = await axiosClient.post<ChatResponseType>('', {
    model: 'gpt-3.5-turbo',
    messages,
  });
  console.log(response.data, response.data.choices[0].message.content);
  return response.data.choices[0].message.content;
}
