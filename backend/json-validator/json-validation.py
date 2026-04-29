from jsonschema import validate, ValidationError
import json

schema = json.load(open("json-schema.json"))
data = json.load(open("data.json"))

try:
    validate(instance=data, schema=schema)
    print("Valide !")
except ValidationError as e:
    print("Invalide :", e)
