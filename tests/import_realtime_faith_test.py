"""Regression coverage for wrong weekday selection and reviewed-source safety."""
import importlib.util
from pathlib import Path
import tempfile
import unittest

spec = importlib.util.spec_from_file_location('rtf', Path(__file__).parents[1] / 'tools/import_realtime_faith.py')
rtf = importlib.util.module_from_spec(spec)
spec.loader.exec_module(rtf)


class FakePage:
    def extract_words(self, **kwargs):
        return [
            {'text': 'Senin', 'size': 9, 'fontname': 'Body', 'top': 100},
            {'text': 'Senin', 'size': 12, 'fontname': 'Heading', 'top': 700},
            {'text': 'Jumat', 'size': 9, 'fontname': 'Body', 'top': 110},
            {'text': 'Jumat', 'size': 12, 'fontname': 'Heading', 'top': 750},
        ]


class ImportRegressionTest(unittest.TestCase):
    def test_weekday_mentions_do_not_replace_display_headings(self):
        self.assertEqual(rtf.day_anchor(FakePage(), 'Senin')['top'], 700)
        self.assertEqual(rtf.day_anchor(FakePage(), 'Jumat')['top'], 750)
        self.assertIsNone(rtf.day_anchor(FakePage(), 'Rabu'))

    def test_reviewed_edition_is_protected_before_pdf_is_opened(self):
        with tempfile.TemporaryDirectory() as directory:
            destination = Path(directory)
            marker = destination / 'id/realtime-faith/2026-q4-rt/source-review.json'
            marker.parent.mkdir(parents=True)
            marker.write_text('{}')
            with self.assertRaisesRegex(ValueError, 'reviewed source content'):
                rtf.import_edition(Path('nonexistent-source.pdf'), destination)
            self.assertEqual(marker.read_text(), '{}')

    def test_bible_quotation_ellipses_are_preserved(self):
        self.assertIn('... bertumbuh', rtf.reflow('“... bertumbuh dalam pengetahuan.”', ''))


if __name__ == '__main__':
    unittest.main()
