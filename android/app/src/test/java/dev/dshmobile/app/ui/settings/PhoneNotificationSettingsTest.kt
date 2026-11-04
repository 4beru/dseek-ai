package dev.dshmobile.app.ui.settings

import androidx.compose.foundation.layout.Column
import androidx.compose.material3.MaterialTheme
import androidx.compose.runtime.*
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import org.robolectric.RobolectricTestRunner
import org.robolectric.annotation.Config

@org.robolectric.annotation.ConscryptMode(org.robolectric.annotation.ConscryptMode.Mode.OFF)
@RunWith(RobolectricTestRunner::class)
@Config(sdk = [28], qualifiers = "es-rES-w400dp-h800dp")
@org.robolectric.annotation.GraphicsMode(org.robolectric.annotation.GraphicsMode.Mode.NATIVE)
class PhoneNotificationSettingsTest {
    @get:Rule val compose = createAndroidComposeRule<androidx.activity.ComponentActivity>()
    @Test fun `N6 one enabled switch no idle status and off action is observable`() {
        var enabled by mutableStateOf(true)
        compose.setContent { MaterialTheme { Column { NotificationSettingsContent(enabled, false, false, false, { enabled = it }, {}) } } }
        compose.onAllNodes(isToggleable()).assertCountEquals(1)
        compose.onNode(isToggleable()).assertIsOn().performClick().assertIsOff()
        assertFalse(enabled)
        compose.onNodeWithText("Ajustes de notificaciones del sistema").assertIsDisplayed()
    }
    @Test fun absentCapabilityShowsNeutralHintAndSingleSwitch() {
        compose.setContent { MaterialTheme { Column { NotificationSettingsContent(true, false, false, false, {}, {}, supported = false) } } }
        compose.onAllNodes(isToggleable()).assertCountEquals(1)
        compose.onNodeWithText("Las notificaciones de resultados de tareas están disponibles si la computadora conectada las admite.").assertIsDisplayed()
        compose.onNodeWithText("Recibe avisos cuando una tarea", substring = true).assertDoesNotExist()
        val renderDirectory = System.getProperty("dsh.render.dir") ?: System.getenv("DSH_ANDROID_RENDER_DIR")
        println("DSH settings render directory: ${renderDirectory ?: "not requested"}")
        renderDirectory?.let { directory -> compose.runOnIdle {
            val view = compose.activity.window.decorView
            val image = android.graphics.Bitmap.createBitmap(view.width, view.height, android.graphics.Bitmap.Config.ARGB_8888)
            view.draw(android.graphics.Canvas(image))
            java.io.File(directory, "notification-settings-capability-absent.png").outputStream().use {
                image.compress(android.graphics.Bitmap.CompressFormat.PNG, 100, it)
            }
        } }
    }
    @Test fun `N6 permission missing and busy render honest disabled controls`() {
        compose.setContent { MaterialTheme { Column { NotificationSettingsContent(true, true, false, true, {}, {}) } } }
        compose.onNode(isToggleable()).assertIsOff().assertIsNotEnabled()
        compose.onNodeWithText("No se pudieron activar las notificaciones.", substring = true).assertIsDisplayed()
    }
}
