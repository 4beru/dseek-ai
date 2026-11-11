# Demo local para capturas en Android

Esta demo usa el cliente Android nativo y el `runDemo` existente del host compilado. No utiliza DSH de producción, sus sesiones, credenciales ni APIs de pago. No publica puertos: escucha únicamente en loopback y conecta el teléfono mediante USB y `adb reverse`.

## Preparación

La APK y el host ya se prepararon localmente. Para retomar sin cambios de código, no hace falta repetir `dseek-build`: entra en `devenv shell` en cada terminal y sigue «Arrancar y conectar». Resultados y límites de la comprobación: [DEMO_ACCEPTANCE.md](DEMO_ACCEPTANCE.md).

Desde la raíz del repositorio, con el entorno Devenv proporcionado por el proyecto:

```sh
devenv shell
dseek-build
```

`dseek-build` prepara el host con `npm ci` y su compilación, y ejecuta `assembleDebug` de Android. El helper no instala herramientas ni compila nada automáticamente. Requiere Node 24, `adb` y `android/app/build/outputs/apk/debug/app-debug.apk`.

Devenv proporciona JDK 21, Node 24/npm y el SDK Android con plataforma 36, build-tools 36.0.0 y platform-tools. El wrapper del proyecto descarga Gradle y las dependencias Android. No necesitas API keys, Android Studio, emulador, NDK, CMake ni una instalación de DSH para esta demo. La primera preparación descarga herramientas y dependencias de sus repositorios públicos y requiere aceptar las licencias del SDK Android. El lockfile conserva las versiones de los inputs Nix.

Sin teléfono se puede consultar la ayuda, compilar y arrancar el servidor, pero no validar la instalación ni obtener capturas físicas. El 2026-11-06 el usuario confirmó que estaba probando la demo en su celular y que funcionaba correctamente. Esta confirmación manual no sustituye una revisión instrumentada ni acredita todos los casos de aceptación pendientes.

## Actualización de la presentación para capturas

La versión preparada el 2026-11-06 elimina las etiquetas de demostración del listado, el chat y Ajustes. Los nombres de proyectos, equipo y perfil, los mensajes precargados y las respuestas posteriores usan texto natural en inglés. La interfaz conserva inglés y español. El modo sigue siendo sintético: no conecta modelos ni DSH, y no ejecuta acciones reales. La identidad técnica `fixture`, los controles de permisos, las advertencias de transporte y los estados offline/error siguen intactos.

**Esta actualización sí necesita instalar la APK nueva**, además de reiniciar el host. La traducción anterior solo cambiaba datos del host, pero los chips retirados eran componentes nativos de Android.

### 1. Preparar la laptop antes de arrancar la demo

Entrar en `devenv shell` desde la raíz del proyecto. El host y la APK se generan con:

```sh
npm --prefix host run build
bash android/gradlew -p android --no-daemon :app:assembleDebug
```

Si ya se entregaron compilados después del cambio, se pueden omitir estos dos comandos. No compilar después de arrancar la demo para no consumir los cinco minutos de la invitación.

Si quedó un servidor anterior abierto, detenerlo con Ctrl+C en su propia terminal. No retirar bloqueos manualmente mientras haya un helper activo.

### 2. Conectar el celular y limpiar los recursos de la demo anterior

En otra terminal dentro de `devenv shell`, conectar USB, autorizar la depuración y consultar localmente `adb devices`. No compartir el serial. Definir la variable con el identificador del dispositivo elegido:

```sh
SERIAL='REEMPLAZAR_POR_EL_SERIAL_DEL_CELULAR'
dseek-demo cleanup --serial "$SERIAL"
```

La limpieza retira únicamente la invitación temporal y el túnel registrados por el helper. Funciona con el servidor detenido y no desinstala ni borra datos de la app.

### 3. Arrancar e instalar la versión actualizada

Terminal 1:

```sh
dseek-demo start
```

Dejarla abierta. Terminal 2, conservando la variable `SERIAL`:

```sh
dseek-demo install --serial "$SERIAL"
```

Este comando instala la APK nueva con `adb install -r`, crea el túnel de esa ejecución y copia la nueva invitación a Descargas. No hace falta ejecutar `adb install` aparte. Si la firma no es compatible, detenerse: no desinstalar ni borrar datos para resolverlo automáticamente.

### 4. Vincular la nueva demo y tomar capturas

Cada arranque crea una demo nueva. Si la app conserva la conexión anterior, en Ajustes elegir **Remove connection from this phone** / **Eliminar conexión de este teléfono** y confirmar **solo si es la conexión descartable de esta demo**. La confirmación elimina sus credenciales, borradores y recibos locales. Guardar antes cualquier texto importante y no usarla sobre una conexión de trabajo valiosa.

Importar el archivo nuevo indicado por el helper, revisar y confirmar la vinculación dentro de los cinco minutos desde el arranque. No reutilizar una invitación anterior. Para capturas en inglés, seleccionar **Settings > Language > English** si la interfaz estaba en español. Revisar listado, filtros de proyectos, chat Markdown, nueva conversación y Ajustes. No deberían aparecer chips ni textos de demostración. Los avisos reales de conexión, permisos o seguridad no se ocultan.

Mantener laptop, terminal del servidor y USB conectados. Al terminar, ejecutar `dseek-demo cleanup --serial "$SERIAL"` antes de desconectar y luego Ctrl+C en el servidor. La app puede quedarse instalada y cerrarse desde el celular.

## Arrancar y conectar

Terminal 1, dentro de `devenv shell`:

```sh
dseek-demo start
```

Se usa por defecto el fixture multiproyecto: cinco proyectos y doce chats con títulos, mensajes y muestras Markdown en inglés. El contenido sintético es independiente del idioma inglés/español de la interfaz. Para la variante sencilla, también en inglés:

```sh
dseek-demo start --simple
```

El proceso permanece en primer plano. Muestra el puerto local dinámico y el siguiente comando, nunca el token. No cerrar esa terminal. No arrancar ambos modos simultáneamente.

### Traducción anterior del contenido ruso

Los textos precargados vienen del host de la laptop. Estos pasos describen únicamente la traducción anterior de datos. Para recibir también la eliminación de chips nativos del 2026-11-06, seguir **Actualización de la presentación para capturas**, que sí instala la APK nueva.

Para un cambio que afecte solo al contenido del host:

1. Ejecutar `dseek-demo cleanup --serial "$SERIAL"` en la terminal 2, con USB conectado, y detener el servidor anterior con Ctrl+C en la terminal 1. Se puede limpiar también después del cierre.
2. Dentro de Devenv, ejecutar `npm --prefix host run build`. Solo actualiza el host compilado, no necesita Gradle ni reinstalar una APK nueva.
3. Arrancar `dseek-demo start` y, en la otra terminal, ejecutar `dseek-demo install --serial "$SERIAL"`. El helper vuelve a instalar la misma APK con `-r` y prepara un túnel e invitación nuevos.
4. Cada arranque usa un estado sintético nuevo. Si la app conserva la conexión de la demo anterior, en Ajustes elegir **Remove connection from this phone** / **Eliminar conexión de este teléfono** y confirmar solo si esa conexión es la demo descartable. Esta acción elimina sus credenciales, borradores y recibos locales. No usarla con una conexión valiosa sin guardar antes lo necesario. Importar después el nuevo archivo indicado por el helper y completar la vinculación dentro de los cinco minutos.

No es una pausa reanudable: Ctrl+C detiene el servidor, mientras que cerrar la app solo cierra su interfaz en el celular. La app puede permanecer instalada. No hace falta desinstalarla ni borrar sus datos para cambiar el contenido de la demo.

Conectar un teléfono con Android 8.0 / API 26 o posterior, habilitar depuración USB y autorizar este ordenador en el teléfono. Consultar `adb devices` para conocer el serial, sin compartir esa salida. El helper exige elegirlo explícitamente y nunca selecciona un dispositivo por su cuenta.

Terminal 2, también dentro de `devenv shell`, reemplazar `SERIAL`:

```sh
dseek-demo install --serial SERIAL
```

La invitación tiene el plazo predeterminado de cinco minutos **desde el arranque**, no desde la instalación. Si caducó, el helper falla antes de instalar: detener la terminal 1 con Ctrl+C y volver a arrancar. Una compilación o instalación lenta puede consumir el plazo, en cuyo caso hay que repetir con una demo nueva.

La instalación usa exclusivamente `adb -s SERIAL install -r` del APK debug actual. Si existe otra firma o un paquete incompatible, se detiene. **Nunca desinstala ni borra datos.** Los certificados debug de ordenadores distintos pueden ser diferentes, por lo que no se garantiza compatibilidad con una instalación previa. No resolver un conflicto borrando una instalación valiosa para conseguir capturas.

El helper crea únicamente el túnel del puerto de esta demo y rechaza una regla ya existente. Copia la invitación como un archivo JSON único en Downloads y abre `MainActivity`. En la UI existente, elegir **Import invitation file** (o su traducción), seleccionar el archivo indicado en Descargas y completar la revisión y vinculación antes de la caducidad. No pegar el token en comandos, informes ni capturas. El archivo es un secreto temporal, no un recurso para distribuir.

**Mantener el portátil encendido, la terminal 1 abierta y USB conectado durante la navegación.** No es una conexión remota autónoma ni un servicio en segundo plano.

## Limpiar y detener

Antes de desconectar USB, en la terminal 2:

```sh
dseek-demo cleanup --serial SERIAL
```

Solo elimina el archivo de invitación registrado para ese dispositivo y su túnel si todavía coincide con el destino registrado. No elimina todas las reglas reverse, no desinstala la app ni borra sus datos. También funciona después de detener el servidor. Si una instalación quedó a medias, ejecutar esta limpieza antes de reintentarlo.

En la terminal 1, pulsar Ctrl+C. SIGINT, SIGTERM y SIGHUP (cierre de terminal) cierran el servidor y eliminan su invitación local y sus metadatos activos únicamente si siguen perteneciendo al proceso. El estado sintético privado puede permanecer bajo `runtime/demo`, ignorado por Git. La invitación local se crea con permisos 0600 y cada directorio de ejecución con 0700. Los recibos de limpieza no contienen el token.

Si el proceso fue terminado a la fuerza o hubo un corte eléctrico, pueden quedar bloqueos y metadatos. El helper se niega a sustituirlos automáticamente. Confirmar primero que no queda ningún helper activo, ejecutar la limpieza del dispositivo cuando sea posible y revisar localmente los archivos de `runtime/demo`. No borrar bloqueos mientras haya un proceso activo. No añadir ese directorio a Git ni compartirlo.

Los comandos equivalentes sin los alias Devenv son `node tools/android-demo.mjs start [--simple]`, `node tools/android-demo.mjs install --serial SERIAL` y `node tools/android-demo.mjs cleanup --serial SERIAL`. Sin argumentos o con `--help`, el script solo muestra ayuda y no accede al teléfono ni inicia un servidor.

## Alcance y aceptación pendiente

Es una demo sintética para preparar capturas posteriores. No acredita integración real con DSH ni preparación para producción. No valida adjuntos, preguntas interactivas, selección de modelos ni aceptación de notificaciones en segundo plano. Tampoco promete ejecución exactamente una vez.

Confirmación manual del usuario, 2026-11-06: demo en uso en su celular y funcionamiento general correcto. Sin una comprobación individual documentada siguen pendientes: conservación de datos y firma compatible, revisión de confianza, navegación completa EN/ES, comportamiento al desconectar USB y limpieza limitada al recurso propio. No confundir esa confirmación general, una comprobación sintáctica o una compilación con una aceptación exhaustiva. Las capturas deben excluir invitaciones, seriales y datos privados.
