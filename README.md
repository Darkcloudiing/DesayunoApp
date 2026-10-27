# 🥐 DesayunApp - Sorteo de Desayuno para la Oficina 🥖🥪

Aplicación web progresiva (PWA) interactiva y moderna para organizar y sortear aportes de desayuno en el trabajo con **balanceo de costos**, **códigos QR dinámicos** y **tarjetas raspables digitales**.

---

## 📋 Lista Oficial de Boletos Cargada (15 Personas)

Los 15 tickets están equilibrados para un promedio de **~$13.28 por persona**:

1. **Ticket 1:** 4 Combos de Pan Canilla ($10.40) + 1 Paquete Vasos ($3.00) = **$13.40**
2. **Ticket 2:** 1 Botella de Aceite de Oliva Extra Virgen = **$15.00**
3. **Ticket 3:** 1 kg Jamón de Pavo ($10.85) + 1 Vinagre ($2.32) = **$13.17**
4. **Ticket 4:** 900g de Mortadela ($12.05) + 1 Bolsa de Lechuga ($1.20) = **$13.25**
5. **Ticket 5:** 2 Salamis de 150g ($12.00) + 1 Bolsa de Lechuga ($1.20) = **$13.20**
6. **Ticket 6:** 2 Salamis de 150g ($12.00) + 1 Bolsa de Lechuga ($1.20) = **$13.20**
7. **Ticket 7:** 600g de Pepperoni ($10.92) + 1 Queso Crema 250g ($1.50) = **$12.42**
8. **Ticket 8:** 600g de Queso Amarillo ($12.00) + 500g de Tomate ($2.00) = **$14.00**
9. **Ticket 9:** 500g de Queso Amarillo ($10.00) + 1 kg de Tomate ($4.00) = **$14.00**
10. **Ticket 10:** 2 Jugos grandes ($10.00) + 1 Paquete Platos ($3.00) = **$13.00**
11. **Ticket 11:** 2 Jugos grandes ($10.00) + 1 Paquete Platos ($3.00) = **$13.00**
12. **Ticket 12:** 2 Jugos grandes ($10.00) + 1 Paquete Servilletas ($2.40) = **$12.40**
13. **Ticket 13:** 2 Aderezos César/Ranch ($11.00) + 1 Queso Crema 250g ($1.50) = **$12.50**
14. **Ticket 14:** 2 Aderezos Tata ($9.00) + 1.1 kg Cebolla ($3.62) = **$12.62**
15. **Ticket 15:** 2 Frascos Aceitunas ($7.80) + 1 Paquete Servilletas ($2.40) + 1 Paquete Fajitas ($3.80) = **$14.00**

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
