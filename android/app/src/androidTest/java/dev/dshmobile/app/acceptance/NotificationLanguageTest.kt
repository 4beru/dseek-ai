package dev.dshmobile.app.acceptance

import android.content.res.Configuration
import androidx.test.platform.app.InstrumentationRegistry
import dev.dshmobile.app.R
import org.junit.Assert.*
import org.junit.Test
import java.util.Locale

/** New watch copy replaces all connection/gap status variants. */
class NotificationLanguageTest {
    @Test fun phoneTaskCopyHasSpanishAndEnglishResources() {
        val context = InstrumentationRegistry.getInstrumentation().targetContext
        val en = context.createConfigurationContext(Configuration(context.resources.configuration).apply { setLocale(Locale.ENGLISH) })
        val es = context.createConfigurationContext(Configuration(context.resources.configuration).apply { setLocale(Locale.forLanguageTag("es")) })
        assertEquals("Answer ready", en.getString(R.string.notif_answer_ready))
        assertEquals("Respuesta lista", es.getString(R.string.notif_answer_ready))
        assertEquals("Se requiere una respuesta", es.getString(R.string.notif_needs_decision))
        assertNotEquals(en.getString(R.string.notif_watch_body), es.getString(R.string.notif_watch_body))
    }
}
