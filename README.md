# STAGED CITY

A solo literary walking experience in Paris, based on Victor Hugo’s *Notre-Dame de Paris*. Built-in English / 中文 switching covers the map, profile, route planning and Gemini-written introductions. The interface combines Gothic headings, typewriter text and monochrome panels with parchment-style maps and a small flock of cursor birds.

Open `/journeys` to choose a perspective, starting point, story thread and interests. Gemini selects three pre-verified paths and writes their introductions; saved maps and route choices appear at `/journeys/routes`. Leave a private or anonymously shared text pin on the full-screen map at `/stories`. The original coffee-walk experience remains at `/explore`. See `STAGED_PARIS_SETUP.md` and `PROJECT_WORKLOG.zh-CN.md` for current setup and verified status.

新版 STAGED CITY 的入口、登录/推荐/评分保留情况与上线步骤见 [STAGED_PARIS_SETUP.md](./STAGED_PARIS_SETUP.md)。

## 项目进度与继续工作

请先阅读 [中文项目工作文档](./PROJECT_WORKLOG.zh-CN.md)，其中区分代码实现、线上待验事项与提交状态，并提供下一步操作及验收清单。数据库只读核查脚本见 [project_state.sql](./supabase/audits/project_state.sql)。

This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
