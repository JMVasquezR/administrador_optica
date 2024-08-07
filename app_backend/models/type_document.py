import re

from django.db.models import (CharField, IntegerField)
from model_utils.models import TimeStampedModel

TYPE_PATRON = (
    (0, 'Numerico'),
    (1, 'Alfanumerico'),
)

TAXPAYER_TYPE = (
    (0, 'Documento para nacionales solamente'),
    (1, 'Documento para extranjeros solamente'),
    (2, 'Documento para nacionales y extranjeros'),
)

TYPE_LENGTH = (
    (0, 'Exacta'),
    (1, 'Inexacta'),
)


class TypeDocument(TimeStampedModel):
    class Meta:
        verbose_name = 'Tipo de documento'
        verbose_name_plural = 'Tipos de documentos'
        db_table = 'TB_BACKEND_TYPE_DOCUMENT'

    short_name = CharField(blank=False, null=False, max_length=25, unique=True, verbose_name='Nombre corto')
    long_name = CharField(blank=False, null=False, max_length=100, verbose_name='Nombre largo')
    type_patron = IntegerField(blank=False, null=False, choices=TYPE_PATRON, verbose_name='Tipo de patron')
    taxpayer_type = IntegerField(blank=False, null=False, choices=TAXPAYER_TYPE, verbose_name='Tipo contribuyente')
    type_length = IntegerField(blank=False, null=False, choices=TYPE_LENGTH)
    length = IntegerField(blank=False, null=False, default=0)

    def __str__(self):
        return self.short_name

    def valid_document(self, code):
        """
        Funcion para la validacion del tipo de documento
        :param code: Es el codigo del documento
        :return: Booleano que indica si el tipo de documento es valida
        """
        if not self.is_valid_regex(self.type_patron, code):
            return False

        if not self.is_valid_length(self.type_length, self.length, code):
            return False

        return True

    @staticmethod
    def is_valid_regex(patron, code):
        """
        Funcion para la validacion del documento, alfanumero o numerico
        :param patron: Es la variable que define si el codigo es Numero o Alfanumerico
        :param code: Es el codigo del documento
        :return: Booleano que indica si el tipo de documento es valida
        """
        if patron == get_value_from_model_choice(TYPE_PATRON, 'Numerico'):
            expresion = re.compile(r'^([0-9]+)$')
        else:
            expresion = re.compile(r'^([\w]+)$')

        result = expresion.match(code)
        return bool(result)

    @staticmethod
    def is_valid_length(type_length, length, code):
        """
        Funcion para la validacion de la londitud del codugo de documento
        :param type_length: Variable que indica que tipo de longitud es
        :param length: Variable que indica la longitud del documento
        :param code: Es el codigo del documento
        :return: Booleano que indica si el tipo de documento es valida
        """
        if type_length == get_value_from_model_choice(TYPE_LENGTH, 'Exacta'):
            return len(code) == length
        else:
            return len(code) <= length


def get_value_from_model_choice(tuple_of_choices, key):
    """
    Este metodo se encargara de obtener el valor de la clave de un choice para djnago models
    :param tuple_of_choices:
    :param key:
    :return:
    """
    for item in tuple_of_choices:
        if item[1] == key:
            return item[0]
    raise Exception('Clave no encontrada')
