module.exports = {
  validateArtifact: (req, res, next) => {
    const { name, age, country_id, period_id, museum_id } = req.body;

    if (!name || name.trim() === '') {
      return res.status(400).json({ message: 'Artifact name is required' });
    }

    if (age !== undefined && age < 0) {
      return res.status(400).json({ message: 'Age cannot be negative' });
    }

    if (!country_id || !period_id || !museum_id) {
      return res.status(400).json({ message: 'Country, Period, and Museum are required' });
    }

    next();
  }
};
