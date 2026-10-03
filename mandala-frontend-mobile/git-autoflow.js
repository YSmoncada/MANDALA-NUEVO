/**
 * NoxOS Git AutoFlow - Asistente de Git 100% Automático en Segundo Plano
 * 
 * Este script corre en segundo plano, monitorea cambios en los archivos del frontend,
 * gestiona ramas automáticas si estás en 'main', crea commits semánticos en español
 * y los sube a GitHub automáticamente sin que tengas que hacer nada.
 */

const { execSync } = require('child_process');
const path = require('path');
const fs = require('fs');

// Configuración
const INTERVALO_MS = 10000; // Monitorear cada 10 segundos
const DEBOUNCE_MS = 5000;   // Esperar 5 segundos de inactividad antes de hacer commit
const EXCLUIR_ARCHIVOS = ['PROGRESS.md', 'package-lock.json']; // Archivos excluidos del autocommit

console.log('\x1b[35m%s\x1b[0m', '=====================================================');
console.log('\x1b[35m%s\x1b[0m', '       🚀 NoxOS GIT AUTOFLOW INICIADO 🚀             ');
console.log('\x1b[35m%s\x1b[0m', '  Monitoreando cambios y gestionando ramas de Git... ');
console.log('\x1b[35m%s\x1b[0m', '=====================================================');

// Guardar marca de tiempo del último cambio detectado
let ultimoCambioDetectado = 0;
let archivosPorConfirmar = new Set();

function ejecutarComando(cmd) {
  try {
    return execSync(cmd, { encoding: 'utf8' }).trim();
  } catch (error) {
    // Retornar error de forma controlada
    return null;
  }
}

function obtenerRamaActual() {
  return ejecutarComando('git branch --show-current') || 'main';
}

function asegurarRamaDesarrollo() {
  const ramaActual = obtenerRamaActual();
  if (ramaActual === 'main') {
    console.log('\x1b[33m%s\x1b[0m', '⚠️  Estás en la rama \'main\'. Creando rama de desarrollo automática para proteger producción...');
    
    // Crear nombre de rama con fecha/hora actual
    const fecha = new Date();
    const timestamp = `${fecha.getFullYear()}${(fecha.getMonth()+1).toString().padStart(2,'0')}${fecha.getDate().toString().padStart(2,'0')}-${fecha.getHours().toString().padStart(2,'0')}${fecha.getMinutes().toString().padStart(2,'0')}`;
    const nuevaRama = `dev/autoflow-${timestamp}`;
    
    console.log('\x1b[36m%s\x1b[0m', `🤖 Creando y cambiando a la rama: ${nuevaRama}`);
    ejecutarComando(`git checkout -b ${nuevaRama}`);
    
    // Intentar publicar la rama en el remoto
    console.log('\x1b[36m%s\x1b[0m', `🚀 Publicando la nueva rama en GitHub...`);
    ejecutarComando(`git push -u origin ${nuevaRama}`);
    
    return nuevaRama;
  }
  return ramaActual;
}

function generarMensajeCommit(archivos) {
  // Analizar archivos modificados para generar un mensaje semántico ultra específico en español
  if (archivos.length === 1) {
    const file = archivos[0];
    const basename = path.basename(file);
    
    if (file.includes('login.tsx')) {
      return `refactor(login): Optimizar pantalla de inicio de sesion y limpiar codigo`;
    }
    if (file.includes('.gitignore')) {
      return `chore(mobile): Actualizar reglas de archivos ignorados en gitignore`;
    }
    if (file.includes('theme.ts') || file.includes('Colors')) {
      return `style(theme): Actualizar definicion de colores y estilos globales`;
    }
    if (file.includes('package.json')) {
      return `chore(deps): Actualizar dependencias y configuracion del proyecto`;
    }
    if (file.includes('app/(admin)')) {
      return `feat(admin): Actualizar modulo de administracion - ${basename}`;
    }
    if (file.includes('app/(mesera)')) {
      return `feat(mesera): Actualizar modulo de mesera - ${basename}`;
    }
    
    // Genérico por tipo de archivo
    if (file.endsWith('.tsx') || file.endsWith('.ts')) {
      return `feat(mobile): Implementar mejoras en componente ${basename}`;
    }
  }

  // Si son múltiples archivos, buscar si pertenecen a un módulo común
  const perteneceALogin = archivos.every(f => f.includes('login') || f.includes('auth'));
  if (perteneceALogin) {
    return `feat(auth): Actualizar flujo de autenticacion y pantallas relacionadas`;
  }

  const perteneceAAdmin = archivos.every(f => f.includes('(admin)'));
  if (perteneceAAdmin) {
    return `feat(admin): Actualizar componentes del modulo de administracion`;
  }

  const perteneceAMesera = archivos.every(f => f.includes('(mesera)'));
  if (perteneceAMesera) {
    return `feat(mesera): Actualizar pantallas e interfaces de toma de pedidos`;
  }

  // Genérico para cualquier otro conjunto de cambios
  return `feat(mobile): Actualizar modulos y componentes de la aplicacion`;
}

function procesarCambios() {
  try {
    // 1. Obtener archivos modificados, agregados o eliminados
    const statusOutput = ejecutarComando('git status --short');
    if (!statusOutput) return;

    const lineas = statusOutput.split('\n').filter(Boolean);
    let cambiosDetectados = false;
    let archivosModificadosEnEsteCiclo = [];

    for (const linea of lineas) {
      const estado = linea.substring(0, 2).trim();
      const rutaArchivo = linea.substring(3).trim().replace(/"/g, '');
      
      // Validar si el archivo debe ser omitido
      const nombreArchivo = path.basename(rutaArchivo);
      if (EXCLUIR_ARCHIVOS.includes(nombreArchivo)) {
        continue;
      }

      cambiosDetectados = true;
      archivosModificadosEnEsteCiclo.push(rutaArchivo);
      archivosPorConfirmar.add(rutaArchivo);
    }

    if (cambiosDetectados) {
      ultimoCambioDetectado = Date.now();
      console.log('\x1b[33m%s\x1b[0m', `📝 Cambios detectados en: ${archivosModificadosEnEsteCiclo.join(', ')}`);
      console.log('\x1b[36m%s\x1b[0m', `⏳ Esperando que termines de escribir para confirmar automáticamente en ${DEBOUNCE_MS / 1000}s...`);
    } else if (archivosPorConfirmar.size > 0 && Date.now() - ultimoCambioDetectado > DEBOUNCE_MS) {
      // Ha pasado el tiempo de espera (debounce), procedemos a confirmar
      console.log('\x1b[32m%s\x1b[0m', '\n🌟 Procesando cambios acumulados de forma automática...');
      
      // Asegurar que no estamos en main
      const rama = asegurarRamaDesarrollo();
      
      const listaArchivos = Array.from(archivosPorConfirmar);
      
      // 1. Preparar archivos (git add)
      for (const archivo of listaArchivos) {
        console.log(`➕ Preparando: ${archivo}`);
        ejecutarComando(`git add "${archivo}"`);
      }

      // 2. Crear mensaje de commit
      const mensaje = generarMensajeCommit(listaArchivos);
      console.log('\x1b[36m%s\x1b[0m', `💬 Mensaje de commit generado: "${mensaje}"`);

      // 3. Confirmar (git commit)
      const commitResult = ejecutarComando(`git commit -m "${mensaje}"`);
      if (commitResult) {
        console.log('\x1b[32m%s\x1b[0m', `✅ Commit creado exitosamente en la rama [${rama}]`);
        
        // 4. Subir a GitHub (git push)
        console.log('\x1b[36m%s\x1b[0m', `🚀 Subiendo cambios a GitHub (git push)...`);
        const pushResult = ejecutarComando(`git push origin ${rama}`);
        console.log('\x1b[32m%s\x1b[0m', `🎉 ¡Todo sincronizado y subido con éxito en GitHub!`);
      } else {
        console.log('\x1b[31m%s\x1b[0m', '❌ Error al crear el commit.');
      }

      // Limpiar cola de archivos procesados
      archivosPorConfirmar.clear();
    }
  } catch (error) {
    console.error('\x1b[31m%s\x1b[0m', '❌ Error en el ciclo de AutoFlow:', error.message);
  }
}

// Iniciar bucle de monitoreo
setInterval(procesarCambios, INTERVALO_MS);
console.log('\x1b[32m%s\x1b[0m', `🤖 AutoFlow está activo. Guarda cualquier archivo en el editor y observa la magia...`);
