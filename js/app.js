
const getPokemon = async () => {
  try {
    const response = await axios.get('https://pokeapi.co/api/v2/pokemon/ditto');

    const pokemon = response.data;

    console.log(pokemon);

    return pokemon;
  } catch (errors) {
    console.error(errors);
  }
};


    
console.log('dab')