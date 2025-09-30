This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, make sure your database schema is up to date:

```bash
npx prisma migrate deploy
```

> **Nota:** Los comandos `npm run dev` y `npm run build` ejecutan `prisma migrate deploy` automáticamente si `DATABASE_URL` está configurado, así que generalmente no tendrás que hacerlo manualmente.

Then run the development server:

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

## Moderation

To allow administrators to remove offensive content set a secret key in your environment:

```bash
export MODERATION_SECRET="choose-a-strong-secret"
```

Moderators can enter this key in the post page to activate a moderation session. While the session is active, they can delete any publication or comment directly from the interface.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

### Pasos recomendados

1. **Configura tu base de datos**
   - Usa una base de datos PostgreSQL con _connection pooling_ (por ejemplo, Vercel Postgres, Neon o Supabase).
   - Copia dos cadenas de conexión:
     - `DATABASE_URL`: apunta al _pool_ de conexiones. Se usará en la aplicación en producción.
     - `DIRECT_URL`: apunta directamente a la base de datos principal. Prisma la utiliza para aplicar migraciones.
2. **Variables de entorno en Vercel**
   - En _Project Settings → Environment Variables_ agrega `DATABASE_URL`, `DIRECT_URL` y `MODERATION_SECRET` (si quieres moderación).
   - Replica estas variables en los entornos `Production`, `Preview` y `Development` según lo necesites.
3. **Comando de build**
   - Usa el comando por defecto `npm run build`. Antes de ejecutar `next build`, el script [`scripts/with-migrations.ts`](scripts/with-migrations.ts) aplicará las migraciones de Prisma utilizando la `DIRECT_URL` configurada.
4. **Deploy**
   - Haz push a tu rama principal o crea un PR. Vercel detectará el proyecto Next.js automáticamente y ejecutará la build.

> Si `DIRECT_URL` no está configurada, Prisma reutilizará `DATABASE_URL` para ejecutar las migraciones. Sin embargo, para despliegues en Vercel se recomienda definir ambas variables para evitar problemas con el _connection pooling_.

Consulta la [documentación de despliegue de Next.js](https://nextjs.org/docs/app/building-your-application/deploying) para más detalles y buenas prácticas adicionales.
