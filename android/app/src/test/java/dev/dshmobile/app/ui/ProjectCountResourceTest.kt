package dev.dshmobile.app.ui

import org.junit.Assert.*
import org.junit.Test
import java.io.File
import java.util.Locale
import javax.xml.parsers.DocumentBuilderFactory

/** Tests the resource catalogue on the JVM; Android's CLDR selection remains platform-owned. */
class ProjectCountResourceTest {
    @Test fun `English project count has singular and plural resources`() {
        val forms = projectCountForms("values")
        assertEquals(setOf("one", "other"), forms.keys)
        assertEquals("1 chat", String.format(Locale.ENGLISH, forms.getValue("one"), 1))
        assertEquals("2 chats", String.format(Locale.ENGLISH, forms.getValue("other"), 2))
        assertEquals("0 chats", String.format(Locale.ENGLISH, forms.getValue("other"), 0))
    }

    @Test fun `Spanish project count supplies singular and plural forms and expected examples`() {
        val forms = projectCountForms("values-es")
        assertEquals(setOf("one", "other"), forms.keys)
        val examples = listOf(Triple(1, "one", "1 chat"), Triple(2, "other", "2 chats"), Triple(5, "other", "5 chats"),
            Triple(21, "other", "21 chats"), Triple(22, "other", "22 chats"), Triple(11, "other", "11 chats"), Triple(0, "other", "0 chats"))
        examples.forEach { (count, category, expected) ->
            assertEquals(expected, String.format(Locale.forLanguageTag("es"), forms.getValue(category), count))
        }
    }

    private fun projectCountForms(qualifier: String): Map<String, String> {
        val document = DocumentBuilderFactory.newInstance().newDocumentBuilder().parse(File("src/main/res/$qualifier/mobile_strings.xml"))
        val plurals = document.getElementsByTagName("plurals")
        val count = (0 until plurals.length).map { plurals.item(it) as org.w3c.dom.Element }
            .singleOrNull { it.getAttribute("name") == "mobile_project_count" }
        assertNotNull("Chat counts must use <plurals>, not a fixed string", count)
        val items = count!!.getElementsByTagName("item")
        return (0 until items.length).associate {
            val item = items.item(it) as org.w3c.dom.Element
            item.getAttribute("quantity") to item.textContent
        }
    }
}
