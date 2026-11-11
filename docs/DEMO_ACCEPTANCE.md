# Preparación local de la demo: resultados

Fecha inicial: 2026-11-04. Actualización del registro: 2026-11-11. Rama de trabajo: `devenv-demo`, creada desde `i18n`.

Las secciones fechadas conservan los resultados observados en cada momento. La confirmación manual posterior del usuario se registra al final y no implica nuevas pruebas del agente.

## Resultado y límites

El entorno se materializó y produjo la APK debug real de DSeek. El servidor sintético existente se arrancó mediante el nuevo helper y se comprobó por su API HTTP y SSE. No se usó un teléfono, emulador, runtime DSH instalado, modelo externo ni API key. Esto acredita preparación local y funcionamiento del servidor demo, **no** instalación física, integración DSH o preparación para producción.

No se ejecutaron suites Gradle/JVM/instrumentación, lint ni suites npm. La compilación sí se ejecutó para obtener una APK instalable. La comprobación puntual del demo se mantuvo en un archivo temporal fuera del repositorio, sin añadir una suite al proyecto.

## Comandos y observaciones

### Entorno y construcción

- `devenv --no-tui shell -- bash -c 'set -euo pipefail; java -version; node --version; npm --version; adb version; test -f "$ANDROID_HOME/platforms/android-36/android.jar"; "$ANDROID_HOME/build-tools/36.0.0/aapt2" version; test ! -e android/local.properties; printf "Environment prerequisites verified\n"'`: terminó con código 0. Se ejecutaron OpenJDK 21.0.12.1, Node 24.20.0, npm 11.19.0, adb 1.0.41 / platform-tools 37.0.1 y aapt2 2.20-13193326. Se comprobó `platforms/android-36/android.jar`.
- La primera invocación sin el separador `--` materializó el shell, pero Devenv interpretó `-c` como opción propia. No se contó como ejecución de las comprobaciones. La invocación corregida produjo las salidas anteriores.
- Los inputs de `devenv.lock` se cotejaron estructuralmente con el lockfile versionado del proyecto Android de referencia. No se leyó su configuración local de secretos ni se modificó ese proyecto.
- `devenv --no-tui shell -- dseek-build`: terminó con código 0. Ejecutó `npm --prefix host ci`, `npm --prefix host run build` y, desde `android/`, `bash ./gradlew --no-daemon :app:assembleDebug`.
- Gradle 9.3.1 informó `BUILD SUCCESSFUL in 4m 26s`, con 38 tareas ejecutadas.
- No se creó `android/local.properties`. No fue necesario instalar un emulador, NDK, CMake, Android Studio, Gradle global ni paquetes del sistema.

Avisos no bloqueantes observados: caché Devenv ya configurada, versión más reciente de Devenv disponible, aviso npm sobre el postinstall de esbuild, override aapt2 marcado experimental y tres bibliotecas nativas de dependencias empaquetadas sin retirar símbolos. No se alteró configuración global ni se actualizaron herramientas para silenciar estos avisos.

### Artefacto Android

Archivo generado, ignorado por Git:

```text
android/app/build/outputs/apk/debug/app-debug.apk
SHA-256 b79cd8ee5b0c2a58c1c5098e715d6e6ad647413a99411202770e1e127932f4fc
```

Comandos dentro del shell:

```sh
apk=android/app/build/outputs/apk/debug/app-debug.apk
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify --verbose "$apk"
"$ANDROID_HOME/build-tools/36.0.0/zipalign" -c -P 16 4 "$apk"
"$ANDROID_HOME/build-tools/36.0.0/aapt2" dump badging "$apk"
sha256sum "$apk"
```

- Firma debug APK v2 verificada, un firmante. No se usó una clave de publicación.
- Comprobación de alineación, incluidas bibliotecas de páginas de 16 KiB: código 0.
- Identidad empaquetada: `dev.dshmobile.app`, versión `0.9.2`, código `19`, compile/target SDK 36.
- Nombre visible y etiqueta española: `DSeek`.
- Catálogos empaquetados: recursos predeterminados en inglés y `es`, sin catálogo ruso. Esta observación no sustituye una revisión visual en pantalla.

### Servidor y helper reales, sin teléfono

Se ejecutó `devenv --no-tui shell -- node "$JCODE_SCRATCH_DIR/dseek-demo-check.mjs"`, con un comprobador temporal que lanzó `node tools/android-demo.mjs start`, leyó la invitación privada en memoria y llamó a las rutas existentes. No reemplazó el servidor ni el adaptador. Resultado: código 0 y `DEMO_PREPARATION_CHECK_OK`.

| Requisito / camino | Observación concreta |
| --- | --- |
| Arranque reproducible del demo | El helper abrió el servidor multiproyecto real. `ss -ltnH` mostró un único listener del puerto elegido, solo en loopback. |
| Invitación privada | Directorio de ejecución 0700, JSON 0600. El token no apareció en la salida del helper. |
| No sustituir un demo activo | Un segundo arranque terminó con código 1 sin reemplazar el servidor. |
| Autenticación | `GET /v1/workspaces` sin credencial devolvió 401. |
| Emparejamiento | `POST /v1/pairings` devolvió 201. Reutilizar la misma invitación devolvió 401. |
| Identidad y capacidades reales del demo | `GET /v1/capabilities` informó `upstreamVersion: fixture`. Adjuntos, preguntas, modelos y promptOutcomes no disponibles. |
| Datos para capturas | Cinco proyectos y doce chats, filtro por proyecto correcto y snapshot con Markdown. |
| Interacción sintética | Crear un chat devolvió 201. Repetir la misma creación devolvió el mismo recibo y no creó otro chat. No implica exactamente-una-vez sobre DSH. |
| Streaming | El endpoint SSE entregó un frame `event: snapshot`. |
| Enviar un mensaje | La API devolvió aceptación y luego apareció `Synthetic demo answer. No model was called.`, con tarea finalizada. |
| Revocación | `DELETE /v1/device` devolvió 204 y la credencial posterior fue rechazada con 401. |
| Cierre propio | SIGTERM eliminó invitación, metadatos activos y bloqueo del helper. |
| Alternativa inglesa | Tras el cierre, `start --simple` arrancó con un proyecto y un chat `Synthetic example`. |

También se ejecutaron `node --check tools/android-demo.mjs`, la ayuda real mediante `devenv --no-tui shell -- dseek-demo --help` y el rechazo de argumentos incompletos sin acceder a dispositivos. `git diff --check` no informó errores.

La caducidad predeterminada se comprobó también por comportamiento: `devenv --no-tui shell -- node "$JCODE_SCRATCH_DIR/dseek-demo-expiry-check.mjs"` arrancó el helper real en modo simple, conservó la invitación sin consumirla, esperó cinco minutos naturales más un margen de dos segundos y obtuvo HTTP 401 al intentar vincularla. No se cambió el reloj, el TTL ni el estado del servidor. SIGINT cerró el proceso y eliminó sus metadatos y bloqueo. Resultado: `DEMO_NATURAL_EXPIRY_CHECK_OK`, código 0.

### Pasada consolidada sobre la entrega final

Después de terminar el código y la guía, se repitieron en una única ejecución los binarios reales del entorno, `dseek-build`, firma/alineación/identidad/catálogos del APK, ayuda y rechazo sin serial del CLI, todos los caminos HTTP/SSE de la tabla, la caducidad natural y las comprobaciones finales de exclusión de artefactos y ausencia de cambios en Android/host. Terminó el 2026-11-04 a las 22:01 UTC con código 0 y `FINAL_PREPARATION_RECHECK_OK`.

- Segunda construcción: `BUILD SUCCESSFUL in 31s`, 38 tareas al día. El SHA-256 del APK siguió siendo el registrado arriba. Es una repetición incremental, no una segunda construcción limpia independiente.
- `aapt2` confirmó además `minSdkVersion: 26`, junto con nombre DSeek, paquete, actividad principal, versión, SDK objetivo y catálogos ya registrados.
- Se comprobó en el SDK materializado que no existen directorios de emulador, NDK, CMake ni imágenes de sistema.
- Los enlaces relativos de la guía e informe resolvieron a archivos existentes. No contienen rutas personales de inicio.
- Después del cierre no había demo activa, bloqueo de arranque ni `android/local.properties`. Los directorios de Nix, dependencias, APK y estado sintético están ignorados por Git.

Estos resultados cierran la preparación sin teléfono solicitada. La ruta física de instalación y limpieza ADB no se sustituyó por un ADB simulado ni por un emulador para declararla aprobada.

### Revisión dirigida de contratos y guía

Se cotejó la invitación generada realmente por el helper con `Invitation.kt`, `InvitationPreview.kt`, `MobileViewModel.importInvitation`, `ProtocolJson.kt` y `HostApi.pair`: esquema versión 1, URL HTTP loopback sin credenciales/query/fragment, token ASCII de 43 caracteres dentro del rango admitido, archivo UTF-8 inferior a 64 KiB y campos públicos `pairingToken`/`deviceName`. La importación y revisión de confianza en el teléfono siguen sin ejecutarse: el cotejo del parser es inspección de contrato, no una prueba física.

También se leyó el XML compilado con `aapt2 dump xmltree` para `AndroidManifest.xml` y `res/xml/debug_network_security_config.xml`. La APK es debug, incluye exactamente `dev.dshmobile.app.MainActivity` y mantiene cleartext global deshabilitado, con la excepción de desarrollo limitada a `127.0.0.1` y `localhost` sin subdominios. No se relajó el transporte de release.

`devenv --no-tui shell -- node "$JCODE_SCRATCH_DIR/dseek-cli-failure-check.mjs"` terminó con código 0 y `CLI_FAILURE_PATHS_CHECK_OK`:

- Ayuda y ejecución sin argumentos no crearon un servidor ni metadatos activos.
- Siete invocaciones malformadas fueron rechazadas: faltan serial/valor, serial inválido, opción simple repetida, opciones de otro comando o argumentos extra de ayuda.
- Se arrancó el helper real y se terminó **solo ese proceso propio** con SIGKILL. Un nuevo arranque rechazó el bloqueo residual sin cambiar byte a byte la invitación ni sus metadatos.
- Tras inspeccionar y retirar únicamente el bloqueo de esa ejecución de comprobación, el registro activo residual también impidió el arranque y conservó los archivos originales.
- La limpieza explícita de los archivos propios del comprobador permitió volver a arrancar y cerrar normalmente con SIGTERM. No se implementó borrado automático de estado obsoleto en el helper ni se tocaron procesos o archivos ajenos.

La guía española coincide con los comandos públicos ejercitados y explica caducidad, estado residual tras corte, preservación de datos, firma incompatible y necesidad de laptop/USB. Sus enlaces locales se comprobaron. No se usó ADB simulado ni se añadieron tests al repositorio.

## Último paso pendiente: teléfono del usuario

Como preflight del tramo físico, el 2026-11-04 a las 22:02 UTC se ejecutó `adb devices -l` dentro de Devenv mediante un pequeño comando Node que no imprime seriales, solo cantidades y estados. Resultado observado: **0 conectados, 0 autorizados, 0 no autorizados y 0 offline**. La enumeración terminó con código 0. No se seleccionó ningún dispositivo ni se intentaron instalación, vinculación, túneles o cambios de datos.

Por tanto, la aceptación de extremo a extremo en teléfono está bloqueada por la ausencia real de un dispositivo conectado, no por una suposición o un fallo suplido con mocks. Faltan autorización USB, instalación con firma compatible, túnel ADB, importación y revisión de invitación, navegación EN/ES y capturas físicas. El usuario reservó estos pasos para su regreso. Si existe una firma incompatible, el helper se detiene sin desinstalar ni borrar datos.

La guía operativa es [DEMO.md](DEMO.md). No quedó un servidor demo arrancado ni una invitación activa esperando al usuario: se generarán al volver, para evitar la caducidad. Para este flujo se requiere laptop encendida y USB conectado mientras se navega. Las capturas ya guardadas no dependen de esa conexión.

No se modificaron fuentes Android, configuración Gradle, código del host ni el runtime DSH instalado. No hubo commits, push ni merge durante esta preparación.

## Incidente de bloqueo residual: 2026-11-05

El arranque del usuario encontró un `start.lock` vacío y metadatos de una ejecución cuyo PID ya no existía. La invitación estaba caducada y no había helpers demo activos ni listener en su puerto anterior. Tras recomprobar esos datos, se conservaron metadatos e invitación en una copia privada bajo `runtime/demo/recovered-*` y se retiró exclusivamente el bloqueo vacío. Las bases sintéticas y los datos del teléfono no se tocaron.

Se añadió manejo de SIGHUP al cierre existente del helper para limpiar también al cerrar normalmente la terminal, sin recuperación automática que pueda borrar un bloqueo activo. SIGKILL o un corte de energía todavía pueden requerir inspección manual.

La primera comprobación de arranque asumió incorrectamente que el PID del wrapper Devenv coincidía con su proceso Node hijo. Se corrigió la comprobación, se identificó y cerró únicamente el helper creado por esa verificación y se repitió usando grupos de procesos propios aislados. En la pasada corregida, el comando público `dseek-demo start` arrancó realmente y su API respondió 401 sin credencial. SIGHUP, SIGINT y SIGTERM eliminaron cada uno servidor, invitación, metadatos y bloqueo. Resultado: `DEMO_LOCK_RECOVERY_AND_SIGNAL_CHECK_OK`, código 0. `node --check`, `git diff --check` y ausencia de cambios en Android/host también pasaron. No se dejó una demo arrancada: el usuario puede iniciarla en su propia terminal sin recompilar la APK.

### Regresión de integración posterior al arreglo

El 2026-11-05 a las 16:35 UTC se ejecutó nuevamente `devenv --no-tui shell -- node "$JCODE_SCRATCH_DIR/dseek-demo-check.mjs"` contra el helper final y el servidor real. Antes de empezar se comprobó que no había registro activo ni bloqueo del usuario. Resultado: `DEMO_PREPARATION_CHECK_OK`, código 0, sin mocks de HTTP, servidor ni ADB.

| Requisito afectado | Resultado observado en esta pasada |
| --- | --- |
| Volver a arrancar después de recuperar el bloqueo | El CLI real inició el servidor en loopback y creó la invitación privada sin imprimir su token. |
| Preservar una ejecución activa | Un segundo arranque fue rechazado y el servidor original siguió atendiendo las peticiones posteriores. |
| Mantener autenticación e integración | Lectura sin credencial 401, pairing 201 y reutilización de invitación 401. Capacidades declaradas como fixture. |
| Conservar datos utilizables para capturas | Cinco proyectos, doce chats, filtro por proyecto y contenido Markdown disponibles por HTTP. |
| Conservar interacción y streaming | Creación duplicada sin chat adicional, snapshot SSE real y mensaje con respuesta sintética, sin llamar a modelos. |
| Revocar acceso | Revocación 204 y lectura posterior con esa credencial 401. |
| No volver a bloquear el arranque normal | SIGTERM retiró invitación, metadatos y bloqueo. El modo simple arrancó después con un proyecto y un chat, y volvió a cerrar limpiamente. |
| No alterar la app ni el host | `node --check tools/android-demo.mjs`, `git diff --check` y `git diff --exit-code -- android host` terminaron con código 0. |

Esta pasada complementa la comprobación pública de SIGHUP/SIGINT/SIGTERM anterior. No se volvió a compilar la APK porque el arreglo solo afecta al helper de la laptop. No se instaló ni manipuló ningún teléfono: la navegación, vinculación y capturas físicas siguen sin verificarse. El fallo de arranque reportado queda verificado por comportamiento real; esto no constituye aceptación Android de extremo a extremo ni integración con DSH de producción.

## Contenido multiproyecto en inglés: 2026-11-05

El usuario informó que el comando de instalación terminó y que veía contenido ruso en su teléfono. Esto aporta una observación del usuario sobre la demo anterior, no una verificación física del agente. La causa era el texto precargado en `host/src/fixture-adapter.ts`, independiente de los recursos EN/ES de Android.

Se tradujeron únicamente nombres, títulos, mensajes, muestras Markdown y su ancla de capturas en el fixture multiproyecto. Se actualizaron los literales esperados de la prueba existente y la documentación, sin añadir suites. Los IDs, fechas, estados, cantidades, permisos y operaciones permanecen iguales. El modo sencillo y las constantes `FIXTURE` no cambiaron.

Comandos y resultados a las 16:45–16:46 UTC:

- `devenv --no-tui shell -- npm --prefix host run build`: código 0. Actualizó el host compilado que importará el próximo `dseek-demo start`. No se compiló Android ni se reinstaló ninguna APK.
- `devenv --no-tui shell -- node --input-type=module`, con un verificador puntual en stdin: importó el `runDemo` compilado real, creó estado privado aislado fuera del repositorio y consultó sus endpoints HTTP/SSE. Resultado `DEMO_ENGLISH_CONTENT_CHECK_OK`, código 0.
- Comparación del AST TypeScript de `host/src/fixture-adapter.ts` contra HEAD, normalizando exclusivamente los literales de texto: `FIXTURE_TEXT_ONLY_AST_CHECK_OK`, código 0. La estructura y todo contenido no textual, incluidas las expresiones de plantillas, coinciden. Un primer intento con scanner léxico sin reescaneo de plantillas dio una diferencia falsa y fue sustituido por esta comparación parseada.
- `git diff --check` y `git diff --exit-code -- android`: código 0. Búsqueda de cirílico en el archivo del fixture: ninguna coincidencia.

| Requisito | Observación del servidor compilado real |
| --- | --- |
| Proyectos en inglés | Los cinco nombres devueltos por `/v1/workspaces` coinciden con las traducciones esperadas. |
| Chats y mensajes en inglés | Se consultaron los doce snapshots por HTTP: doce títulos y veinticuatro mensajes precargados sin cirílico. Todos los prompts comienzan con `Demo task: `. |
| Conservar contenido enriquecido | Se comprobaron encabezados, negritas, listas, campo `email`, bloque Kotlin y el ancla visible `Foundation portal plan`. También se comprobó `Demo radar overview`. |
| Conservar organización y estados | Doce chats, dos en ejecución y tres del proyecto foundation. El filtro devuelve solo ese proyecto. |
| Conservar interacción | Pairing 201, reutilización 401, lectura sin credencial 401, creación duplicada sin chat adicional, snapshot SSE, respuesta sintética y tarea finalizada. Revocación 204 seguida de lectura 401. |
| No interrumpir al usuario | Se cerró únicamente el servidor aislado del verificador. No se tocaron el helper activo, su invitación, sus bloqueos, el teléfono ni los túneles del usuario. |

No se ejecutaron suites npm/Gradle ni una revisión visual en teléfono. La comprobación acredita el contenido servido por el host, no el renderizado físico. La ejecución que el usuario ya tenía abierta conserva los textos anteriores hasta reiniciarla. Cada arranque del helper crea un estado nuevo, por lo que requiere túnel e invitación nuevos y volver a vincular la demo. [DEMO.md](DEMO.md) explica cómo hacerlo sin desinstalar ni borrar datos globales, y advierte del alcance de eliminar una conexión local de demo.

## Presentación natural para capturas: 2026-11-06

Se retiraron el chip de demostración del listado y chat, su banda/divisor exclusivo y el aviso de Ajustes, junto con los dos recursos EN/ES que quedaron sin uso. Los textos del fixture, incluidos modo sencillo, nombre del equipo, proyectos, perfil, mensajes y respuesta posterior, ahora usan copy natural en inglés. El formato Markdown/Kotlin y el ancla `Foundation portal plan` se mantienen. No se ocultaron errores, estados offline, permisos, advertencias de transporte ni entrega incierta. El modelo y el repositorio conservan `demo` y la versión técnica sigue siendo `fixture`.

Se alinearon las expectativas existentes del test del host y de capturas Android, así como los selectores/copias esperadas de dos herramientas de aceptación relay. No se añadieron suites ni se ejecutaron pruebas instrumentadas o relay/PowerShell. El archivo no relacionado `logo.svg` no fue editado. No hubo commits, publicaciones, instalaciones o modificaciones de datos en teléfono.

### Construcción y comprobación del artefacto

Dentro de Devenv se ejecutaron `npm --prefix host run build` y `bash android/gradlew -p android --no-daemon :app:assembleDebug`. Resultado: host compilado y `BUILD SUCCESSFUL in 1m 40s`, 38 tareas, 13 ejecutadas y 25 al día. La comparación del certificado antes/después produjo `DEBUG_SIGNER_UNCHANGED_OK`.

El job inicial terminó con código 141 después de compilar y verificar firma/alineación: el comprobador truncaba `aapt2 dump badging` con `head` bajo `pipefail`, provocando SIGPIPE. No fue un fallo de compilación. La comprobación final del 2026-11-06 a las 14:07 UTC capturó las salidas completas mediante Node dentro de Devenv, sin esa tubería, y terminó con código 0.

APK actual: `android/app/build/outputs/apk/debug/app-debug.apk`.

```text
SHA-256 4e8a53f89d283fe5343f67dc09adf59e6f066a890a5f64b13c8a9618ba9184a9
```

| Requisito | Evidencia final observada |
| --- | --- |
| APK instalable de actualización | `apksigner verify --verbose` y `zipalign -c -P 16 4` con código 0. Mismo certificado debug que la APK anterior de esta laptop, paquete `dev.dshmobile.app` y etiquetas DSeek/ES conservadas. Esto no verifica la firma de la instalación física actual. |
| Sin chip/aviso empaquetado | `aapt2 dump resources` no contiene `mobile_demo_tag` ni `mobile_demo_notice`. Se inspeccionaron todos los DEX del APK y ninguno contiene `demo_label`. No quedan referencias al componente o recursos en `src/main`. |
| Nombres y conversaciones naturales | El `runDemo` compilado real, con estado privado aislado, sirvió por HTTP cinco proyectos, doce títulos y veinticuatro mensajes sin marcadores demo/synthetic/fixture/sample/fictional, ni cirílico en campos visibles. También se comprobaron nombre del equipo, perfil, título creado y respuesta posterior. |
| Cobertura del modo sencillo | El mismo recorrido comprobó un proyecto, un chat y sus dos mensajes, además del perfil y una nueva respuesta, sin marcadores de prueba visibles. |
| Preservar contenido enriquecido y estados | Encabezado y ancla coincidentes, listas, negritas, `email` y bloque Kotlin presentes. Dos chats en ejecución y tres chats de foundation en el filtro, sin cambiar IDs. |
| Conservar límites y operaciones | Versión `fixture` y capacidades reducidas conservadas. Lectura sin credencial 401, pairing 201, reutilización 401, creación duplicada con el mismo recibo, snapshot SSE, respuesta posterior con tarea finalizada, revocación 204 y lectura posterior 401. |
| Evitar efectos en la sesión del usuario | Se cerraron solo los dos servidores aislados de comprobación. No se tocó el helper activo, invitaciones, bloqueos, teléfono o túneles del usuario. |

Resultados: `APK_SIGNATURE_ALIGNMENT_AND_DEMO_MARKER_REMOVAL_OK` y `NATURAL_DEMO_FINAL_CHECK_OK`. `node --check` de los helpers JavaScript modificados y `git diff --check` también terminaron con código 0.

La APK nueva y el host quedaron preparados. Para retirar los componentes nativos se requiere instalar la APK actualizada, además de reiniciar y volver a vincular el host para cargar el nuevo contenido. [DEMO.md](DEMO.md), sección «Actualización de la presentación para capturas», contiene los comandos. En esta comprobación del agente no se verificaron la aceptación visual en teléfono ni la compatibilidad con la instalación concreta del usuario. El aspecto de captura no convierte este fixture en DSH real ni en un modelo conectado.

## Confirmación manual del usuario: 2026-11-06

Posteriormente, el usuario confirmó que estaba probando la app demo en su celular y que todo funcionaba correctamente. Esto aporta una confirmación manual del funcionamiento general de la demo instalada, sin una nueva ejecución física por parte del agente. No se documentaron individualmente todas las comprobaciones de EN/ES, conservación de datos, desconexión USB, limpieza o compatibilidad de firma, por lo que no se declaran aprobadas en su totalidad.

## Consolidación local: 2026-11-11

Se revisaron los cambios para agruparlos en commits de entorno/herramientas, presentación y documentación. Se actualizó la guía con la confirmación manual anterior, manteniendo separados los resultados históricos de compilación y servidor. Esta consolidación no requiere reinstalar la app ni repetir compilaciones o pruebas de ejecución. `logo.svg` queda fuera por ser un archivo independiente. No se autoriza ningún push ni cambio remoto en esta etapa.

Comprobaciones de esta consolidación, todas con código 0:

- `node --check tools/android-demo.mjs` y `node --check tools/relay-acceptance-probe.mjs`: sintaxis JavaScript válida.
- `git diff --check`: sin errores de espacios en el diff.
- `git check-ignore runtime/demo/example.json .devenv/example android/app/build/outputs/apk/debug/app-debug.apk host/dist/demo.js`: estado privado y artefactos excluidos.
- Revisión puntual de contenido añadido y archivos nuevos: sin patrones de claves privadas, tokens GitHub/OpenAI ni rutas personales detectados; lockfile JSON legible y enlaces relativos de ambas guías existentes. Resultado `ADDED_CONTENT_SENSITIVE_PATTERN_AND_DOC_LINK_CHECK_OK`. Esta búsqueda limitada no es una auditoría exhaustiva de secretos.

La consulta de solo lectura a las ramas remotas mediante `git ls-remote` falló por autenticación SSH (`Permission denied (publickey)`). No se modificó autenticación ni configuración remota. Por tanto, las ramas se preparan a partir de las referencias locales verificadas; antes de publicar, el usuario deberá actualizar y cotejar el estado remoto desde su terminal autenticada.
