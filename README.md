# 🥐 DesayunApp - Sorteo de Desayuno para la Oficina 🥖🥪

Aplicación web progresiva (PWA) interactiva y moderna para organizar y sortear aportes de desayuno en el trabajo con **balanceo de costos**, **códigos QR dinámicos** y **tarjetas raspables digitales**.

---

## 📋 Lista Oficial de Boletos Cargada (25 Personas)

Los 25 tickets están equilibrados para un promedio de **~$10.83 por persona** (rango súper estrecho $10.00 - $11.50):

1. **Ticket 1:** 1 Aceite de Oliva (250ml) ($7.50) + 1 Queso Crema ($1.50) + 1 Botella Vinagre ($2.32) = **$11.32**
2. **Ticket 2:** 1 Aceite de Oliva (250ml) ($7.50) + 1 Queso Crema ($1.50) + 1 Paquete Servilletas ($2.40) = **$11.40**
3. **Ticket 3:** 1 kg Jamón de Pavo rebanado (Boleto A) = **$10.85**
4. **Ticket 4:** 1 kg Jamón de Pavo rebanado (Boleto B) = **$10.85**
5. **Ticket 5:** 750g Mortadela rebanada (Boleto A) = **$10.00**
6. **Ticket 6:** 750g Mortadela rebanada (Boleto B) = **$10.00**
7. **Ticket 7:** 1 Salami 150g ($6.00) + 1 kg Tomate fresco ($4.00) + 1 Bolsa Lechuga ($1.20) (Boleto A) = **$11.20**
8. **Ticket 8:** 1 Salami 150g ($6.00) + 1 kg Tomate fresco ($4.00) + 1 Bolsa Lechuga ($1.20) (Boleto B) = **$11.20**
9. **Ticket 9:** 1 Salami 150g ($6.00) + 1.1 kg Cebolla ($3.62) + 1 Bolsa Lechuga ($1.20) (Boleto A) = **$10.82**
10. **Ticket 10:** 1 Salami 150g ($6.00) + 1.1 kg Cebolla ($3.62) + 1 Bolsa Lechuga ($1.20) (Boleto B) = **$10.82**
11. **Ticket 11:** 1 Salami 150g ($6.00) + 2 Combos Pan Canilla ($5.20) = **$11.20**
12. **Ticket 12:** 400g Pepperoni rebanado ($7.28) + 1 Paquete de Fajitas ($3.80) = **$11.08**
13. **Ticket 13:** 400g Pepperoni rebanado ($7.28) + 1 Queso Crema ($1.50) + 1 Paquete Servilletas ($2.40) = **$11.18**
14. **Ticket 14:** 550g Queso Amarillo rebanado (Boleto A) = **$11.00**
15. **Ticket 15:** 550g Queso Amarillo rebanado (Boleto B) = **$11.00**
16. **Ticket 16:** 500g Queso Amarillo ($10.00) + 1 Queso Crema 250g ($1.50) = **$11.50**
17. **Ticket 17:** 3 Combos de Pan Canilla ($7.80) + 1 Paquete de Platos ($3.00) (Boleto A) = **$10.80**
18. **Ticket 18:** 3 Combos de Pan Canilla ($7.80) + 1 Paquete de Platos ($3.00) (Boleto B) = **$10.80**
19. **Ticket 19:** 2 Frascos de Aderezo César o Ranch ($11.00) = **$11.00**
20. **Ticket 20:** 2 Jugos grandes pasteurizados (Boleto A) = **$10.00**
21. **Ticket 21:** 2 Jugos grandes pasteurizados (Boleto B) = **$10.00**
22. **Ticket 22:** 2 Jugos grandes pasteurizados (Boleto C) = **$10.00**
23. **Ticket 23:** 2 Jugos grandes pasteurizados (Boleto D) = **$10.00**
24. **Ticket 24:** 1 Frasco Aceitunas ($3.90) + 1 Aderezo Tata ($4.50) + 1 Paquete Vasos ($3.00) (Boleto A) = **$11.40**
25. **Ticket 25:** 1 Frasco Aceitunas ($3.90) + 1 Aderezo Tata ($4.50) + 1 Paquete Vasos ($3.00) (Boleto B) = **$11.40**

---

## 🌐 Cómo Desplegar en Render.com (Paso a Paso)

Render.com te permite tener la app pública en internet 24/7 **gratis**, con HTTPS y base de datos persistente:

1. **Crea una cuenta gratuita en [Render.com](https://render.com/)**.
2. **Sube tu proyecto a GitHub** (un repositorio privado o público).
3. En el panel de Render, haz clic en **"New +"** y selecciona **"Web Service"**.
4. Conecta tu repositorio de GitHub.
5. Render detectará automáticamente el archivo `render.yaml` que ya creamos en el proyecto, o configúralo con estos campos:
   * **Name:** `desayunapp`
   * **Runtime:** `Node`
   * **Build Command:** `npm install && npm run build`
   * **Start Command:** `npm start`
   * **Instance Type:** `Free`
6. Haz clic en **"Deploy Web Service"**.
7. En 2 minutos Render te dará un enlace público como: `https://desayunapp-xxxx.onrender.com`.

### 📲 ¿Cómo funciona una vez subido a Render?
* **Tú abres:** `https://tu-app.onrender.com/?admin=true` (Ingresas tu PIN de administrador).
* Tocas en **"Proyector & QR"**: El código QR se genera automáticamente apuntando a tu URL pública en internet.
* **Tus compañeros:** Escanean el QR desde cualquier lugar (desde su casa o en la oficina, por Wi-Fi o datos 4G), tocan su tarjeta dorada en su celular y descubren su aporte.
* Las asignaciones quedan guardadas en tiempo real en la base de datos SQLite.

---

## 💻 Ejecución en Local (En tu computadora)

```bash
# Iniciar frontend y backend
npm run dev
```

* **Local:** [http://localhost:3000](http://localhost:3000)
* **Wi-Fi Oficina:** `http://192.168.100.122:3000`
* **Panel de Administrador:** [http://localhost:3000/?admin=true](http://localhost:3000/?admin=true)
