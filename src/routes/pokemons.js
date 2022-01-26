const { Router } = require("express");
const { Pokemon, Type } = require("../db");
const axios = require("axios");
const router = Router();
const { Sequalize, Op } = require("sequelize");

router.get("/", async (req, res, next) => {
  return res.send("Base de datos conectada");
});

router.get("/pokemons", async (req, res, next) => {
  if (req.query.name) {
    const { name } = req.query;
    const lowerCaseName = name.toLowerCase();

    try {
      const queryPokemonDB = await Pokemon.findOne({
        where: {
          name: { [Op.like]: lowerCaseName },
        },
        include: [{ model: Type, attributes: ["name"] }],
      });

      if (queryPokemonDB) {
        return res.json({
          name: queryPokemonDB.name,
          id: queryPokemonDB.id,
          hp: queryPokemonDB.hp,
          strength: queryPokemonDB.strength,
          defense: queryPokemonDB.defense,
          speed: queryPokemonDB.speed,
          height: queryPokemonDB.height,
          weight: queryPokemonDB.weight,
          image: queryPokemonDB.image,
          types: queryPokemonDB.types.map((p) => {
            return p.name;
          }),
        });
      }

      const queryPokemonAPI = await axios
        .get(`https://pokeapi.co/api/v2/pokemon/${lowerCaseName}`)
        .then((d) => d.data)
        .catch((error) => error);

      const selectedPokemon = {
        id: queryPokemonAPI.id,
        name: queryPokemonAPI.name,
        image:
          queryPokemonAPI.sprites.other["official-artwork"]["front_default"],
        types: queryPokemonAPI.types.map((p) => {
          return p.type.name;
        }),
        hp: queryPokemonAPI.stats[0].base_stat,
        strength: queryPokemonAPI.stats[1].base_stat,
        defense: queryPokemonAPI.stats[2].base_stat,
        speed: queryPokemonAPI.stats[5].base_stat,
        height: queryPokemonAPI.height,
        weight: queryPokemonAPI.weight,
      };
      return res.status(200).json(selectedPokemon);
    } catch (error) {
      res.status(400).send({ error: "Pokemon not found" });
    }
  }
  try {
    const apiPokemonsURLs = await axios
      .get("https://pokeapi.co/api/v2/pokemon?limit=10")
      .then((d) => d.data.results);

    const apiPokemons = apiPokemonsURLs.map(async (p) => {
      const mapedPokemon = await axios.get(p.url);
      if (mapedPokemon) {
        const allAPIPokemons = {
          id: mapedPokemon.data.id,
          name: mapedPokemon.data.name,
          image:
            mapedPokemon.data.sprites.other["official-artwork"][
              "front_default"
            ],
          types: mapedPokemon.data.types.map((p) => {
            return p.type.name;
          }),
          hp: mapedPokemon.data.stats[0].base_stat,
          strength: mapedPokemon.data.stats[1].base_stat,
          defense: mapedPokemon.data.stats[2].base_stat,
          speed: mapedPokemon.data.stats[5].base_stat,
          height: mapedPokemon.data.height,
          weight: mapedPokemon.data.weight,
        };
        return allAPIPokemons;
      }
    });

    const apiPokemonsRes = await Promise.all(apiPokemons);

    const dbPokemons = await Pokemon.findAll({
      include: [{ model: Type, attributes: ["name"] }],
    });

    if (dbPokemons.length) {
      const createdPokemons = dbPokemons.map((p) => {
        return {
          id: p.id,
          image: p.image,
          name: p.name,
          types: p.types.map((t) => {
            return t.name;
          }),
          strength: p.strength,
          hp: p.hp,
          defense: p.defense,
          speed: p.speed,
          height: p.height,
          weight: p.weight,
        };
      });

      return res.status(200).json(apiPokemonsRes.concat(createdPokemons));
    }

    return res.status(200).json(apiPokemonsRes);
  } catch (error) {
    next(error);
  }
});

router.get("/pokemons/:idPokemon", async (req, res, next) => {
  const { idPokemon } = req.params;

  try {
    if (!isNaN(idPokemon)) {
      const apiPokemon = await axios
        .get(`https://pokeapi.co/api/v2/pokemon/${idPokemon}`)
        .then((d) => d.data);

      const selectedPokemon = {
        id: apiPokemon.id,
        name: apiPokemon.name,
        image: apiPokemon.sprites.other["dream_world"]["front_default"],
        types: apiPokemon.types.map((p) => p.type.name),
        hp: apiPokemon.stats[0].base_stat,
        strength: apiPokemon.stats[1].base_stat,
        defense: apiPokemon.stats[2].base_stat,
        speed: apiPokemon.stats[5].base_stat,
        height: apiPokemon.height,
        weight: apiPokemon.weight,
      };
      return res.json(selectedPokemon);
    }
    const dbPokemon = await Pokemon.findOne({
      where: {
        id: idPokemon,
      },
      include: [{ model: Type, attributes: ["name"] }],
    });
    if (dbPokemon) {
      return res.json({
        name: dbPokemon.name,
        id: dbPokemon.id,
        hp: dbPokemon.hp,
        strength: dbPokemon.strength,
        defense: dbPokemon.defense,
        speed: dbPokemon.speed,
        height: dbPokemon.height,
        weight: dbPokemon.weight,
        image: dbPokemon.image,
        types: dbPokemon.types.map((p) => {
          return p.name;
        }),
      });
    }
    return res.status(404).send("Id not found");
  } catch (error) {
    next(error);
  }
});

router.post("/pokemons/create", async (req, res, next) => {
  try {
    const { name, image, types, hp, strength, defense, speed, height, weight } =
      req.body;

    const createPokemon = await Pokemon.create({
      name: name.toLowerCase(),
      image:
        image ||
        "https://cdn.pixabay.com/photo/2016/07/13/08/31/pokemon-1513925_960_720.jpg",
      hp,
      strength,
      defense,
      speed,
      height,
      weight,
    });
    types.map(async (t) => {
      const [postTypes, succes] = await Type.findOrCreate({
        where: {
          name: t,
        },
        defaults: { name: t },
      });
      createPokemon.addType(postTypes);
    });

    return res.status(201).send(createPokemon);
  } catch (error) {
    next(error);
  }
});

module.exports = router;
