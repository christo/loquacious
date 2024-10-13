import {ArrowCircleLeft, ArrowCircleRight, Error} from "@mui/icons-material";
import {Box, IconButton, Typography} from "@mui/material";
import {marked} from 'marked';
import React, {useEffect, useState} from 'react';
import "./App.css";

interface ChatResponse {
  message: string;
}

const responseError = (e: any): ChatResponse => ({
  message: `Error fetching response: ${e}`,
});

const RESPONSE_NULL: ChatResponse = {
  message: "",
}

const RESPONSE_NONE: ChatResponse = {
  message: "No response from GPT",
}

function markdownResponse(response: ChatResponse) {
  if (response !== null) {
    return marked.parse(response.message);
  } else {
    return "";
  }
}

type HealthError = {
  code: number,
  message: string;
  type: string;
}

type HealthStatus = {
  error: HealthError | null;
  message: string | null;
} | null;

function ShowError({error}: { error: HealthError }) {
  return (<Typography color="error"><Error fontSize="large"/> {error.message}</Typography>);
}

function Status() {
  const [status, setStatus] = useState<HealthStatus>(null);

  function fetchData() {
    try {
      fetch("http://localhost:3001/health").then(result => {
        result.json().then(data => {
          setStatus(data || null);
        });
      });
    } catch (e) {
      console.error(e);
    }
  }

  useEffect(() => {
    fetchData();

    const intervalId = setInterval(() => {
      fetchData();
    }, 60000);

    // Clean up the interval when the component unmounts
    return () => clearInterval(intervalId);
  }, []);


  return status === null ? <div>...</div> : (
    status?.error ? <ShowError error={status.error}/>
      : <div>{status.message}</div>
  );

}

const SEERS = [
  "frizzi_kooky_female_wizard_grandmotherly_with_a_few_tarot_cards_1d4d0332-6426-4527-b773-9ca826f6055f.png",
  "aija_vu_1800s_highly_detailed_full-color_hyper_realistic_illust_77daf823-b958-471f-af1f-b331b8d39494.png",
  "anvilnw_91716_vintage_circus_poster_of_a_female_fortune_teller__beedb90a-a91d-4a41-be96-02d0c5cdc42d.png",
  "badbadbabsybrown_Alphonse_mucha_style_portrait_of_An_ethnically_2acbcd6a-c339-42e0-9822-421627c4e708.png",
  "basthongthos_A_fortune_teller_with_an_illuminated_crystal_ball__1d9d6ea6-200c-4f53-ab29-a3af9052fc45.png",
  "biankav_a_cute_kitten_dressed_as_a_fortune_teller_with_a_big_or_c73d156e-e410-4fd2-a6cd-8af759addc06.png",
  "bobbyp9577_Madam_Eva_is_an_elderly_woman_with_a_commanding_pres_864e6567-fa48-4f60-863e-a4720a05303c.png",
  "dntkillspiders_ancient_hekate_accurate_--v_6.1_4390f3fe-7e66-4761-a1bb-38034d0eb06f.png",
  "geesloper_a_female_witch_doctor_from_a_Dungeons__Dragons_advent_699f37ae-3205-4548-80b6-1af24fed31c7.png",
  "gsingh7064_A_photograph_of_an_elderly_woman_fortune_teller_with_d2043900-bb30-4eea-aace-a793ced1c0d5.png",
  "gyrhound_bcg_Fantasy_art_portrait_of_a_dark_skinned_female_fort_5d312690-c91e-47c1-a839-7d7483078517.png",
  "hamham1215_You_can_choose_the_best_one_from_several_fortune_tel_5217d6be-a34d-4914-83d6-7558e0737f23.png",
  "hekalitha11_trickster_fortuneteller_woman_offering_a_deal_vinta_4497d656-a819-4196-8fe7-968187813f7b.png",
  "ivansenko_baldurs_gate_portrait_male_character_conjurer_curious_1633802c-0a8e-42fb-9b33-e98d75cb846d.png",
  "johnk118_A_crazt_cat_lady_who_looks_like_this._Sheis_wearing_st_a6555474-975c-4bbb-8524-aa28997e5fd4.png",
  "kcollins2991_black_woman_fortune_teller_at_a_table_with_a_glowi_5fbe3040-b01f-46a1-87cb-f8f5dc2d5dd3.png",
  "lottolotto_documentary_photo_anchient_spiritual_healer_--v_6.1_8e08f3af-c43f-4129-88c9-18a740496ee0.png",
  "louis_92293_A_woman_50_years_old_A_clairvoyant_in_front_of_a_cr_88895190-68bf-4b7d-ac46-ad89cd1abbb6.png",
  "maebh__a_carnival_fortune_teller_machine_with_an_older_woman_fr_1b421e68-c00b-4cda-82fd-968782bac4cf.png",
  "mamuschka23_grey_black_and_masculine_male_mainecoon_cat_in_a_sa_1407c107-678c-4aff-bc23-bb0a14513e11.png",
  "tanaka0813_photo_of_an_older_woman_sitting_in_the_center_wearin_3ebe835b-c47c-40b0-83db-13f05a4deee0.png",
  "tashabylazanjata_arabic_fortune_teller_sitting_at_table_over_pl_54500814-fde2-4528-afae-76ffc115c47f.png",
  "vacremon_silk_purple_gold_fantasy_magic_arabian_merchant_lord_-_feeb3490-c1f7-42cb-8171-202dbf92718f.png",
  "vicki_05522_The_eyes_are_large_and_round_a_pale_yellow_filled_w_825046c6-6c7a-40a6-ad0e-08aa56e9adcd.png",
  "wholahay_fantasy_art_portrait_of_a_pale-skinned_woman_sorceress_4c3dd0a8-3781-4757-b4b2-aca37e7e78bc.png",
]

interface ImageChooserProps {
  seerIdx: number;
  nextSeer: () => void;
  prevSeer: () => void;
}

function ImageChooser({seerIdx, nextSeer, prevSeer}: ImageChooserProps) {
  return <Box sx={{display: "flex", gap: 2, mt: 2, alignItems: "center"}}>
    <IconButton aria-label="previous" size="large" onClick={prevSeer}>
      <ArrowCircleLeft fontSize="inherit"/>
    </IconButton>
    <Typography fontWeight="700">{seerIdx + 1} of {SEERS.length}</Typography>
    <IconButton aria-label="next" size="large" onClick={nextSeer}>
      <ArrowCircleRight fontSize="inherit"/>
    </IconButton>
  </Box>
}

const App: React.FC = () => {
  const [prompt, setPrompt] = useState('');
  const [response, setResponse] = useState<ChatResponse>(RESPONSE_NULL);
  const [loading, setLoading] = useState(false);

  const [seerIdx, setSeerIdx] = useState(18);
  const prevSeer = () => {
    let newValue = (seerIdx - 1 + SEERS.length) % SEERS.length;
    setSeerIdx(newValue);
  };
  const nextSeer = () => {
    let newValue = (seerIdx + 1 + SEERS.length) % SEERS.length;
    setSeerIdx(newValue % SEERS.length);
  };
  const handleSubmit = async () => {
    if (!prompt.trim()) {
      return;
    }
    setLoading(true);

    try {
      const result = await fetch('http://localhost:3001/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({"prompt": prompt}),
      });

      const data = await result.json();
      setResponse(data.response || RESPONSE_NONE);
    } catch (error) {
      console.error('Error fetching response:', error);
      setResponse(responseError(error));
    } finally {
      setLoading(false);
    }
  };

  function showResponse() {
    return (<>
      <div>
        <div dangerouslySetInnerHTML={{__html: markdownResponse(response)}}></div>
      </div>
    </>)

  }

  // submit on enter
  const handleKeyDown = async (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault(); // Prevent default Enter behavior (new line)
      await handleSubmit(); // Submit the form
    }
  };

  return (
    <Box className="primary">
      <Box sx={{m: 2, position: "absolute", bottom: 0, left: 0, p: 0}}>
        <ImageChooser seerIdx={seerIdx} nextSeer={nextSeer} prevSeer={prevSeer} />
      </Box>
      <img alt="fortune teller" width="100%" className="seer" src={`/img/${SEERS[seerIdx]}`}/>

      <Box>
        <form id="prompt">
        <textarea
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={10}
          cols={80}
          placeholder="talk to me"
        />

        </form>
        <Box className="controls">
          <Typography>{loading ? <p>Loading...</p> : response === RESPONSE_NULL ? "" : showResponse()}</Typography>
          <Status/>
          <Typography sx={{background: "#333", borderRadius: "15px", p: 1}}>
            The greatest way to live with honour in this world is to be what we pretend to be.
          </Typography>
        </Box>
      </Box>


    </Box>
  );
};

export default App;